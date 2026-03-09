// Warren PWA — terminal screen
// Sets up xterm.js, connects to Warren server via WebSocket, manages sessions

import { Terminal } from 'xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import type { WsMessage } from '@warren/types'
import { WarrenWsClient } from '../lib/ws-client'
import { applyTheme } from './theme'
import { initToolbar } from './toolbar'
import { addSession, removeSession, setActiveSession } from './sessions'

let terminal: Terminal | null = null
let fitAddon: FitAddon | null = null
let wsClient: WarrenWsClient | null = null
let currentSessionId: string | null = null

export function getTerminal(): Terminal | null {
  return terminal
}

export function sendToTerminal(data: string): void {
  if (wsClient && currentSessionId) {
    wsClient.send({ type: 'terminal:data', sessionId: currentSessionId, data })
  }
}

export function initTerminal(host: string, token: string): void {
  const container = document.getElementById('terminal-container')!

  // Clean up existing terminal
  if (terminal) {
    terminal.dispose()
  }
  if (wsClient) {
    wsClient.disconnect()
  }

  // Create xterm instance
  terminal = new Terminal({
    allowTransparency: false,
    cursorBlink: true,
    fontSize: 14,
    fontFamily: 'JetBrains Mono, Fira Code, Menlo, monospace',
    lineHeight: 1.4,
    scrollback: 5000,
    theme: {
      background: '#1a1b26',
      foreground: '#a9b1d6',
      cursor: '#c0caf5',
    },
  })

  fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new WebLinksAddon())

  // Apply saved theme
  const savedTheme = localStorage.getItem('warren:theme') ?? 'tokyo-night'
  applyTheme(terminal, savedTheme)

  terminal.open(container)
  fitAddon.fit()

  // Handle user input
  terminal.onData((data) => {
    sendToTerminal(data)
  })

  // Connect WebSocket
  const wsUrl = `ws://${host}/ws?token=${encodeURIComponent(token)}`
  wsClient = new WarrenWsClient(wsUrl)

  wsClient.onOpen(() => {
    console.log('[warren] WebSocket connected')
    updateConnectionBadge(true)
  })

  wsClient.onClose(() => {
    console.log('[warren] WebSocket disconnected')
    updateConnectionBadge(false)
    terminal?.write('\r\n\x1b[31m[disconnected — reconnecting...]\x1b[0m\r\n')
  })

  wsClient.onMessage((msg: WsMessage) => {
    switch (msg.type) {
      case 'auth:challenge':
        // v0.1: send token as signature
        wsClient!.send({
          type: 'auth:response',
          signature: token,
          deviceId: getDeviceId(),
        })
        break

      case 'auth:success':
        // Request a new session
        wsClient!.send({ type: 'session:create' })
        break

      case 'auth:failure':
        terminal?.write(`\r\n\x1b[31m[auth failed: ${msg.reason}]\x1b[0m\r\n`)
        wsClient!.disconnect()
        break

      case 'session:created':
        currentSessionId = msg.session.id
        addSession(msg.session, (sessionId) => {
          // On tab click — TODO: multi-session support
          setActiveSession(sessionId)
        })
        break

      case 'session:ended':
        terminal?.write('\r\n\x1b[33m[session ended]\x1b[0m\r\n')
        removeSession(msg.sessionId)
        currentSessionId = null
        break

      case 'terminal:data':
        terminal?.write(msg.data)
        break

      case 'pong':
        break

      default:
        break
    }
  })

  wsClient.connect()

  // Initialize touch toolbar
  initToolbar()

  // Handle terminal resize
  setupResizeHandler()
}

function setupResizeHandler(): void {
  // Visual Viewport API — accounts for software keyboard on mobile
  const vv = window.visualViewport

  function onResize() {
    if (!fitAddon || !terminal) return

    // Fit the terminal to the container
    fitAddon.fit()

    // Notify server of new dimensions
    if (wsClient && currentSessionId) {
      wsClient.send({
        type: 'terminal:resize',
        sessionId: currentSessionId,
        cols: terminal.cols,
        rows: terminal.rows,
      })
    }
  }

  if (vv) {
    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', () => {
      // Keep terminal positioned when keyboard appears
      const container = document.getElementById('terminal-container')!
      const toolbarHeight = document.getElementById('touch-toolbar')!.offsetHeight
      const availableHeight = (vv.height ?? window.innerHeight) - toolbarHeight
      container.style.height = `${availableHeight}px`
      onResize()
    })
  } else {
    window.addEventListener('resize', onResize)
  }
}

function updateConnectionBadge(connected: boolean): void {
  let badge = document.querySelector('.connection-badge')
  if (!badge) {
    badge = document.createElement('div')
    badge.className = 'connection-badge'
    document.getElementById('session-tabs')?.appendChild(badge)
  }
  badge.textContent = connected ? '● connected' : '○ offline'
  badge.className = `connection-badge ${connected ? 'connected' : 'disconnected'}`
}

function getDeviceId(): string {
  let id = localStorage.getItem('warren:deviceId')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('warren:deviceId', id)
  }
  return id
}
