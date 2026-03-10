// Terminal session state — vanilla store consumed by React via useSyncExternalStore
//
// v0.2: Supports HMAC challenge-response auth with encrypted transport.

import type { TerminalSession, WsMessage } from '@warren/types'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal } from 'xterm'
import type { SavedHost } from './connection'
import { applyTerminalTheme } from './theme'
import { uuid } from './utils'
import { hmacSign, WarrenWsClient } from './ws-client'

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

// Visible debug log — last few connection events, shown in UI when sessions are empty
let debugLog: string[] = []
function dbg(msg: string): void {
  debugLog = [...debugLog.slice(-9), `${new Date().toLocaleTimeString()} ${msg}`]
  emit()
}

// Cached snapshot — only updated on emit() to avoid useSyncExternalStore re-render loops
let cachedSnapshot: {
  sessions: Map<string, SessionState>
  activeSessionId: string | null
  debugLog: string[]
} = {
  sessions,
  activeSessionId,
  debugLog,
}

function emit(): void {
  cachedSnapshot = { sessions, activeSessionId, debugLog }
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

// ---------------------------------------------------------------------------
// Helpers — base64 <-> Uint8Array (browser-compatible)
// ---------------------------------------------------------------------------

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ─── Subscriptions for useSyncExternalStore ──────────────────────────────────

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSnapshot(): {
  sessions: Map<string, SessionState>
  activeSessionId: string | null
  debugLog: string[]
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

export function connectToHost(host: string, token: string, savedHost?: SavedHost): void {
  if (wsClients.has(host)) return

  // Determine connection URL based on auth version
  let wsUrl: string
  if (savedHost?.authVersion === 'v2' && savedHost.sharedSecret) {
    wsUrl = `ws://${host}/ws?deviceId=${encodeURIComponent(savedHost?.deviceId ?? getDeviceId())}`
  } else {
    wsUrl = `ws://${host}/ws?token=${encodeURIComponent(token)}`
  }

  const wsClient = new WarrenWsClient(wsUrl)
  wsClients.set(host, wsClient)

  // Note: sharedSecret is set AFTER auth:success, not here.
  // Setting it before auth would cause auth:response to be encrypted,
  // which the server cannot decrypt until after authentication completes.

  wsClient.onOpen(() => {
    dbg(`connected to ${host}`)
  })

  wsClient.onClose(() => {
    dbg(`disconnected from ${host}`)
    emit()
  })

  wsClient.onMessage((msg: WsMessage) => {
    handleMessage(host, token, wsClient, msg, savedHost)
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
  savedHost?: SavedHost,
): void {
  switch (msg.type) {
    case 'auth:challenge':
      if (savedHost?.authVersion === 'v2' && savedHost.sharedSecret) {
        // v0.2: Sign challenge nonce with HMAC (synchronous, no crypto.subtle)
        dbg(`auth:challenge — signing with HMAC (deviceId=${savedHost.deviceId?.slice(0, 8)})`)
        try {
          const secretKey = fromBase64(savedHost.sharedSecret)
          const sig = hmacSign(msg.nonce, { key: secretKey })
          dbg('sending auth:response')
          wsClient.send({
            type: 'auth:response',
            signature: sig,
            deviceId: savedHost?.deviceId ?? getDeviceId(),
          })
        } catch (err) {
          dbg(`hmacSign error: ${err}`)
        }
      } else {
        // v0.1: Send token as signature
        dbg('auth:challenge — sending token (v0.1)')
        wsClient.send({ type: 'auth:response', signature: token, deviceId: getDeviceId() })
      }
      break

    case 'auth:success':
      dbg('auth:success — activating encryption, creating session')
      // Activate encrypted transport now that the server has verified our identity
      if (savedHost?.authVersion === 'v2' && savedHost.sharedSecret) {
        wsClient.setSharedSecret(fromBase64(savedHost.sharedSecret))
      }
      wsClient.send({ type: 'session:create' })
      break

    case 'auth:failure':
      dbg(`auth:failure — ${msg.reason}`)
      break

    case 'session:created':
      dbg('session:created — opening terminal')
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
