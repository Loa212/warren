// PTY Manager — spawns and manages shell processes via node-pty
//
// TODO(v0.2): Migrate to Bun's native PTY support once stable.
// Bun 1.1+ may support `pty: true` in Bun.spawn() — check https://bun.sh/docs/api/spawn
// For now we use node-pty which is battle-tested and supports all platforms.
//
// Bun compatibility: Bun's tty.ReadStream does not properly read from PTY file descriptors
// (it immediately closes the fd). We monkey-patch the tty module BEFORE loading node-pty
// to replace ReadStream with a polling implementation that works in both Node.js and Bun.

import { createRequire } from 'module'
import { EventEmitter } from 'events'
import { readSync } from 'fs'

// Patch tty.ReadStream before node-pty loads it
const ttyModule = createRequire(import.meta.url)('tty') as typeof import('tty')
const OriginalReadStream = ttyModule.ReadStream

class BunCompatReadStream extends EventEmitter {
  fd: number
  readable = true
  isTTY = true
  isRaw = false
  private _pollTimer: ReturnType<typeof setInterval> | null = null
  private _buf = Buffer.alloc(4096)
  private _closed = false

  constructor(fd: number) {
    super()
    this.fd = fd
    // Start polling immediately to read PTY output
    this._pollTimer = setInterval(() => this._poll(), 10)
  }

  private _poll(): void {
    if (this._closed) return
    try {
      const n = readSync(this.fd, this._buf, 0, this._buf.length, null)
      if (n > 0) {
        const data = this._buf.slice(0, n).toString('utf8')
        this.emit('data', data)
      }
    } catch {
      // EAGAIN = no data yet (non-blocking fd), EBADF = fd closed
      // Silently ignore both — this is normal for a PTY
    }
  }

  destroy(): void {
    this._closed = true
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
    if (!this.emit('close')) {
      // nothing
    }
  }

  setEncoding(_enc: string): this {
    return this
  }

  resume(): this {
    return this
  }

  setRawMode(mode: boolean): this {
    this.isRaw = mode
    return this
  }
}

// Replace tty.ReadStream with our compatible version
;(ttyModule as unknown as Record<string, unknown>)['ReadStream'] = BunCompatReadStream

import * as pty from 'node-pty'
import { randomUUID } from 'crypto'
import type { TerminalSession } from '@warren/types'

interface PtyEntry {
  process: pty.IPty
  session: TerminalSession
  dataCallbacks: Set<(data: string) => void>
  exitCallbacks: Set<(code: number) => void>
}

const sessions = new Map<string, PtyEntry>()

const DEFAULT_SHELL = process.env.SHELL ?? '/bin/zsh'
const DEFAULT_COLS = 80
const DEFAULT_ROWS = 24

export function createSession(shell?: string, cols?: number, rows?: number): TerminalSession {
  const id = randomUUID()
  const resolvedShell = shell ?? DEFAULT_SHELL
  const resolvedCols = cols ?? DEFAULT_COLS
  const resolvedRows = rows ?? DEFAULT_ROWS

  const proc = pty.spawn(resolvedShell, [], {
    name: 'xterm-256color',
    cols: resolvedCols,
    rows: resolvedRows,
    cwd: process.env.HOME ?? '/',
    env: process.env as Record<string, string>,
  })

  const session: TerminalSession = {
    id,
    deviceId: '', // set by server after auth
    shell: resolvedShell,
    startedAt: Date.now(),
    cols: resolvedCols,
    rows: resolvedRows,
  }

  const entry: PtyEntry = {
    process: proc,
    session,
    dataCallbacks: new Set(),
    exitCallbacks: new Set(),
  }

  sessions.set(id, entry)

  proc.onData((data: string) => {
    for (const cb of entry.dataCallbacks) {
      cb(data)
    }
  })

  proc.onExit(({ exitCode }: { exitCode: number }) => {
    for (const cb of entry.exitCallbacks) {
      cb(exitCode)
    }
    sessions.delete(id)
  })

  return session
}

export function writeToSession(id: string, data: string): void {
  const entry = sessions.get(id)
  if (!entry) throw new Error(`Session not found: ${id}`)
  entry.process.write(data)
}

export function resizeSession(id: string, cols: number, rows: number): void {
  const entry = sessions.get(id)
  if (!entry) throw new Error(`Session not found: ${id}`)
  entry.process.resize(cols, rows)
  entry.session.cols = cols
  entry.session.rows = rows
}

export function killSession(id: string): void {
  const entry = sessions.get(id)
  if (!entry) return
  entry.process.kill()
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
