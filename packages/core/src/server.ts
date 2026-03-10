// Warren WebSocket Server — powered by Bun.serve
//
// Serves:
//   ws://HOST:PORT/ws?token=TOKEN  — WebSocket terminal endpoint
//   GET /health                    — health check JSON
//   GET /*                         — static file serving (for PWA in production)
//
// Auth v0.1: static token comparison.
// TODO(v0.2): Replace with X25519 challenge-response (see auth.ts)

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { WarrenConfig, WsMessage } from '@warren/types'
import type { ServerWebSocket } from 'bun'
import { validateToken } from './auth'
import { loadConfig } from './config'
import { getDevice, listDevices, revokeDevice, updateLastSeen } from './devices'
import * as ptyManager from './pty'

const VERSION = '0.1.0'
const START_TIME = Date.now()

interface WsData {
  deviceId: string
  authenticated: boolean
  token: string
}

// Track active WebSocket connections per device for forced disconnection
const activeConnections = new Map<string, Set<ServerWebSocket<WsData>>>()

function trackConnection(deviceId: string, ws: ServerWebSocket<WsData>): void {
  if (!activeConnections.has(deviceId)) {
    activeConnections.set(deviceId, new Set())
  }
  activeConnections.get(deviceId)?.add(ws)
}

function untrackConnection(ws: ServerWebSocket<WsData>): void {
  const conns = activeConnections.get(ws.data.deviceId)
  if (!conns) return
  conns.delete(ws)
  if (conns.size === 0) activeConnections.delete(ws.data.deviceId)
}

function disconnectDevice(deviceId: string): void {
  const conns = activeConnections.get(deviceId)
  if (!conns) return
  for (const ws of conns) {
    send(ws, { type: 'auth:failure', reason: 'Device revoked' })
    ws.close()
  }
  activeConnections.delete(deviceId)
}

export interface ServerOptions {
  port?: number
  token: string
  staticDir?: string
  config?: WarrenConfig
}

function send(ws: ServerWebSocket<WsData>, msg: WsMessage): void {
  ws.send(JSON.stringify(msg))
}

function handleMessage(ws: ServerWebSocket<WsData>, raw: string): void {
  let msg: WsMessage
  try {
    msg = JSON.parse(raw) as WsMessage
  } catch {
    return
  }

  // Auth gate — all messages except auth:response require authenticated state
  if (!ws.data.authenticated) {
    if (msg.type === 'auth:response') {
      if (validateToken(msg.signature, ws.data.token)) {
        // Reject revoked devices
        const device = getDevice(msg.deviceId)
        if (device && device.permission === 'revoked') {
          send(ws, { type: 'auth:failure', reason: 'Device has been revoked' })
          ws.close()
          return
        }

        ws.data.authenticated = true
        ws.data.deviceId = msg.deviceId
        trackConnection(msg.deviceId, ws)
        updateLastSeen(msg.deviceId)
        send(ws, { type: 'auth:success' })
      } else {
        send(ws, { type: 'auth:failure', reason: 'Invalid token' })
        ws.close()
      }
    } else {
      send(ws, { type: 'auth:failure', reason: 'Not authenticated' })
    }
    return
  }

  switch (msg.type) {
    case 'ping':
      send(ws, { type: 'pong' })
      break

    case 'session:create': {
      const session = ptyManager.createSession(msg.shell)
      session.deviceId = ws.data.deviceId
      send(ws, { type: 'session:created', session })

      // Stream PTY output → WebSocket
      ptyManager.onData(session.id, (data) => {
        send(ws, { type: 'terminal:data', sessionId: session.id, data })
      })

      // Clean up on session exit
      ptyManager.onExit(session.id, (_code) => {
        send(ws, { type: 'session:ended', sessionId: session.id })
      })
      break
    }

    case 'terminal:data': {
      try {
        ptyManager.writeToSession(msg.sessionId, msg.data)
      } catch {
        // Session may have ended; silently ignore
      }
      break
    }

    case 'terminal:resize': {
      try {
        ptyManager.resizeSession(msg.sessionId, msg.cols, msg.rows)
      } catch {
        // Session may have ended; silently ignore
      }
      break
    }

    case 'session:kill': {
      ptyManager.killSession(msg.sessionId)
      send(ws, { type: 'session:ended', sessionId: msg.sessionId })
      break
    }

    default:
      // Unknown message type — ignore
      break
  }
}

export function startServer(options: ServerOptions) {
  const config = options.config ?? loadConfig()
  const port = options.port ?? config.port ?? 9470
  const staticDir = options.staticDir ?? null

  const server = Bun.serve<WsData>({
    port,

    fetch(req, server) {
      const url = new URL(req.url)

      // WebSocket upgrade
      if (url.pathname === '/ws') {
        const token = url.searchParams.get('token') ?? ''
        const _nonce = crypto.randomUUID()

        const upgraded = server.upgrade(req, {
          data: {
            deviceId: '',
            authenticated: false,
            token,
          },
        })

        if (!upgraded) {
          return new Response('WebSocket upgrade failed', { status: 400 })
        }

        // The challenge will be sent in the `open` handler
        return undefined
      }

      // Health endpoint
      if (url.pathname === '/health') {
        const body = JSON.stringify({
          status: 'ok',
          version: VERSION,
          nodeId: config.nodeId,
          uptime: Math.floor((Date.now() - START_TIME) / 1000),
          sessions: ptyManager.listSessions().length,
        })
        return new Response(body, {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Device API endpoints
      // TODO(v0.2): authenticate HTTP API endpoints
      if (url.pathname === '/api/devices' && req.method === 'GET') {
        return Response.json(listDevices())
      }

      if (
        url.pathname.startsWith('/api/devices/') &&
        url.pathname.endsWith('/revoke') &&
        req.method === 'POST'
      ) {
        const id = url.pathname.split('/')[3]
        if (!id) return new Response('Bad request', { status: 400 })
        const device = revokeDevice(id)
        if (!device) return Response.json({ error: 'Device not found' }, { status: 404 })
        disconnectDevice(id)
        return Response.json(device)
      }

      if (url.pathname.startsWith('/api/devices/') && req.method === 'GET') {
        const id = url.pathname.split('/')[3]
        if (!id) return new Response('Bad request', { status: 400 })
        const device = getDevice(id)
        if (!device) return Response.json({ error: 'Device not found' }, { status: 404 })
        return Response.json(device)
      }

      // Static file serving (PWA in production)
      if (staticDir) {
        let filePath = join(staticDir, url.pathname)
        if (url.pathname === '/' || !existsSync(filePath)) {
          filePath = join(staticDir, 'index.html')
        }
        if (existsSync(filePath)) {
          return new Response(Bun.file(filePath))
        }
      }

      return new Response('Not found', { status: 404 })
    },

    websocket: {
      open(ws) {
        // Send auth challenge immediately on connect
        const nonce = crypto.randomUUID()
        send(ws, { type: 'auth:challenge', nonce })
      },

      message(ws, message) {
        handleMessage(ws, message.toString())
      },

      close(ws) {
        untrackConnection(ws)

        // Kill all sessions owned by this device
        const sessions = ptyManager.listSessions().filter((s) => s.deviceId === ws.data.deviceId)
        for (const session of sessions) {
          ptyManager.killSession(session.id)
        }
      },
    },
  })

  console.log(`Warren server running on ws://localhost:${port}/ws`)
  console.log(`Health: http://localhost:${port}/health`)

  return server
}
