// PTY Manager — spawns and manages shell processes via Bun's native PTY support
//
// Uses Bun.spawn() with the `terminal` option for first-class pseudo-terminal
// support. No external dependencies needed — Bun handles PTY creation, resize
// (SIGWINCH), and raw I/O natively. POSIX only (macOS / Linux).

import { randomUUID } from 'node:crypto'
import type { TerminalSession } from '@warren/types'

interface PtyEntry {
  proc: ReturnType<typeof Bun.spawn>
  session: TerminalSession
  dataCallbacks: Set<(data: string) => void>
  exitCallbacks: Set<(code: number) => void>
}

const sessions = new Map<string, PtyEntry>()

const DEFAULT_SHELL = process.env.SHELL ?? '/bin/zsh'
const DEFAULT_COLS = 80
const DEFAULT_ROWS = 24

const decoder = new TextDecoder()

export function createSession(shell?: string, cols?: number, rows?: number): TerminalSession {
  const id = randomUUID()
  const resolvedShell = shell ?? DEFAULT_SHELL
  const resolvedCols = cols ?? DEFAULT_COLS
  const resolvedRows = rows ?? DEFAULT_ROWS

  const entry: PtyEntry = {
    proc: null as unknown as ReturnType<typeof Bun.spawn>,
    session: {
      id,
      deviceId: '',
      shell: resolvedShell,
      startedAt: Date.now(),
      cols: resolvedCols,
      rows: resolvedRows,
    },
    dataCallbacks: new Set(),
    exitCallbacks: new Set(),
  }

  const proc = Bun.spawn([resolvedShell], {
    terminal: {
      cols: resolvedCols,
      rows: resolvedRows,
      name: 'xterm-256color',
      data(_terminal, data) {
        const str = decoder.decode(data)
        for (const cb of entry.dataCallbacks) {
          cb(str)
        }
      },
    },
    cwd: process.env.HOME ?? '/',
    env: {
      ...process.env,
      TERM: 'xterm-256color',
    },
  })

  entry.proc = proc

  // Track process exit for callbacks and cleanup
  proc.exited.then((exitCode) => {
    for (const cb of entry.exitCallbacks) {
      cb(exitCode)
    }
    sessions.delete(id)
  })

  sessions.set(id, entry)
  return entry.session
}

export function writeToSession(id: string, data: string): void {
  const entry = sessions.get(id)
  if (!entry) throw new Error(`Session not found: ${id}`)
  entry.proc.terminal?.write(data)
}

export function resizeSession(id: string, cols: number, rows: number): void {
  const entry = sessions.get(id)
  if (!entry) throw new Error(`Session not found: ${id}`)
  entry.proc.terminal?.resize(cols, rows)
  entry.session.cols = cols
  entry.session.rows = rows
}

export function killSession(id: string): void {
  const entry = sessions.get(id)
  if (!entry) return
  entry.proc.kill()
  sessions.delete(id)
}

export function onData(id: string, cb: (data: string) => void): () => void {
  const entry = sessions.get(id)
  if (!entry) throw new Error(`Session not found: ${id}`)
  entry.dataCallbacks.add(cb)
  return () => entry.dataCallbacks.delete(cb)
}

export function onExit(id: string, cb: (code: number) => void): () => void {
  const entry = sessions.get(id)
  if (!entry) throw new Error(`Session not found: ${id}`)
  entry.exitCallbacks.add(cb)
  return () => entry.exitCallbacks.delete(cb)
}

export function getSession(id: string): TerminalSession | undefined {
  return sessions.get(id)?.session
}

export function listSessions(): TerminalSession[] {
  return Array.from(sessions.values()).map((e) => e.session)
}
