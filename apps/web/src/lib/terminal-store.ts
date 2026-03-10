// Terminal session state — vanilla store consumed by React via useSyncExternalStore

import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import type { TerminalSession, WsMessage } from '@warren/types'
import { WarrenWsClient } from './ws-client'
import { applyTerminalTheme } from './theme'
import { uuid } from './utils'

export interface SessionState {
  session: TerminalSession
  terminal: Terminal
  fitAddon: FitAddon
  wsClient: WarrenWsClient
  host: string
}

type Listener = () => void

const sessions = new Map<string, SessionState>()
const wsClients = new Map<string, WarrenWsClient>()
let activeSessionId: string | null = null
const listeners = new Set<Listener>()

// Cached snapshot — only updated on emit() to avoid useSyncExternalStore re-render loops
let cachedSnapshot: { sessions: Map<string, SessionState>; activeSessionId: string | null } = {
  sessions,
  activeSessionId,
}

function emit(): void {
  cachedSnapshot = { sessions, activeSessionId }
  for (const fn of listeners) fn()
}

function getDeviceId(): string {
  let id = localStorage.getItem('warren:deviceId')
  if (!id) {
    id = uuid()
    localStorage.setItem('warren:deviceId', id)
  }
  return id
}

// ─── Subscriptions for useSyncExternalStore ──────────────────────────────────

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot(): {
  sessions: Map<string, SessionState>
  activeSessionId: string | null
} {
  return cachedSnapshot
}

// ─── Actions ────────────────────────────────────────────────────────────────

export function hasSessionsForHost(host: string): boolean {
  for (const state of sessions.values()) {
    if (state.host === host) return true
  }
  return false
}

export function connectToHost(host: string, token: string): void {
  if (wsClients.has(host)) return

  const wsClient = new WarrenWsClient(`ws://${host}/ws?token=${encodeURIComponent(token)}`)
  wsClients.set(host, wsClient)

  wsClient.onOpen(() => {
    console.log(`[warren] connected to ${host}`)
  })

  wsClient.onClose(() => {
    console.log(`[warren] disconnected from ${host}`)
    emit()
  })

  wsClient.onMessage((msg: WsMessage) => {
    handleMessage(host, token, wsClient, msg)
  })

  wsClient.connect()
}

export function createSession(): void {
  if (!activeSessionId) return
  const state = sessions.get(activeSessionId)
  if (state) state.wsClient.send({ type: 'session:create' })
}

export function killSession(sessionId: string): void {
  const state = sessions.get(sessionId)
  if (!state) return
  state.wsClient.send({ type: 'session:kill', sessionId })
  destroySession(sessionId)
}

export function activateSession(sessionId: string): void {
  activeSessionId = sessionId
  emit()
}

export function sendData(data: string): void {
  if (!activeSessionId) return
  const state = sessions.get(activeSessionId)
  if (state) {
    state.wsClient.send({ type: 'terminal:data', sessionId: activeSessionId, data })
  }
}

export function getAllTerminals(): import('xterm').Terminal[] {
  return [...sessions.values()].map((s) => s.terminal)
}

export function resizeActiveSession(cols: number, rows: number): void {
  if (!activeSessionId) return
  const state = sessions.get(activeSessionId)
  if (state) {
    state.wsClient.send({ type: 'terminal:resize', sessionId: activeSessionId, cols, rows })
  }
}

// ─── Internal ───────────────────────────────────────────────────────────────

function handleMessage(
  host: string,
  token: string,
  wsClient: WarrenWsClient,
  msg: WsMessage,
): void {
  switch (msg.type) {
    case 'auth:challenge':
      wsClient.send({ type: 'auth:response', signature: token, deviceId: getDeviceId() })
      break

    case 'auth:success':
      wsClient.send({ type: 'session:create' })
      break

    case 'auth:failure':
      console.error('[warren] auth failed:', msg.reason)
      break

    case 'session:created':
      addSession(msg.session, host, wsClient)
      break

    case 'session:ended':
      destroySession(msg.sessionId)
      break

    case 'terminal:data': {
      const state = sessions.get(msg.sessionId)
      state?.terminal.write(msg.data)
      break
    }

    case 'pong':
      break

    default:
      break
  }
}

function addSession(session: TerminalSession, host: string, wsClient: WarrenWsClient): void {
  const terminal = new Terminal({
    allowTransparency: false,
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'JetBrains Mono, Fira Code, Menlo, monospace',
    lineHeight: 1.4,
    scrollback: 5000,
  })

  const fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new WebLinksAddon())

  terminal.onData((data: string) => {
    wsClient.send({ type: 'terminal:data', sessionId: session.id, data })
  })

  const savedTheme = localStorage.getItem('warren:theme') ?? 'tokyo-night'
  applyTerminalTheme(terminal, savedTheme)

  sessions.set(session.id, { session, terminal, fitAddon, wsClient, host })
  activeSessionId = session.id
  emit()
}

function destroySession(sessionId: string): void {
  const state = sessions.get(sessionId)
  if (!state) return

  state.terminal.dispose()
  sessions.delete(sessionId)

  if (activeSessionId === sessionId) {
    const remaining = [...sessions.keys()]
    activeSessionId = remaining.length > 0 ? (remaining[remaining.length - 1] ?? null) : null
  }
  emit()
}
