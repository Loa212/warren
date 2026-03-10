// Warren WebSocket Server — powered by Bun.serve
//
// Serves:
//   ws://HOST:PORT/ws?token=TOKEN    — v0.1 token auth (backward compat)
//   ws://HOST:PORT/ws?deviceId=ID    — v0.2 reconnection (HMAC challenge-response)
//   ws://HOST:PORT/ws?pair=true      — v0.2 initial pairing (ECDH key exchange)
//   GET /health                      — health check JSON
//   GET /*                           — static file serving (for PWA in production)

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { EncryptedPayload, WarrenConfig, WsMessage } from '@warren/types'
import type { ServerWebSocket } from 'bun'
import { validateToken } from './auth'
import { loadConfig } from './config'
import {
  decrypt,
  deriveSharedSecret,
  encrypt,
  type SharedSecret,
  secretFromBase64,
  verifyChallenge,
} from './crypto'
import {
  addPairedDevice,
  getOrCreateIdentity,
  getPairedDevice,
  updateDeviceLastSeen,
} from './devices'
import { advertise, destroyDiscovery, discoverOnce } from './discovery'
import { generateQrSvg, startPairing, validatePairingNonce } from './pairing'
import * as ptyManager from './pty'

const VERSION = '0.2.0'
const START_TIME = Date.now()

// ---------------------------------------------------------------------------
// Per-connection state
// ---------------------------------------------------------------------------

type AuthMode = 'token' | 'pair' | 'keypair'

interface WsData {
  deviceId: string
  authenticated: boolean
  authMode: AuthMode
  token: string // v0.1 token (only for token mode)
  nonce: string // challenge nonce
  sharedSecret: SharedSecret | null // derived after pairing/reconnection
}

// ---------------------------------------------------------------------------
// Server options
// ---------------------------------------------------------------------------

export interface ServerOptions {
  port?: number
  token?: string // optional (v0.1 fallback)
  staticDir?: string
  config?: WarrenConfig
}

// ---------------------------------------------------------------------------
// Send helpers
// ---------------------------------------------------------------------------

function sendPlain(ws: ServerWebSocket<WsData>, msg: WsMessage): void {
  ws.send(JSON.stringify(msg))
}

async function sendSecure(ws: ServerWebSocket<WsData>, msg: WsMessage): Promise<void> {
  if (ws.data.sharedSecret) {
    const payload = await encrypt(JSON.stringify(msg), ws.data.sharedSecret)
    ws.send(JSON.stringify({ type: 'encrypted:message', payload }))
  } else {
    ws.send(JSON.stringify(msg))
  }
}

// ---------------------------------------------------------------------------
// Message handling
// ---------------------------------------------------------------------------

async function unwrapMessage(ws: ServerWebSocket<WsData>, raw: string): Promise<WsMessage | null> {
  try {
    const parsed = JSON.parse(raw) as WsMessage
    if (parsed.type === 'encrypted:message' && ws.data.sharedSecret) {
      const inner = await decrypt(
        (parsed as { payload: EncryptedPayload }).payload,
        ws.data.sharedSecret,
      )
      return JSON.parse(inner) as WsMessage
    }
    return parsed
  } catch {
    return null
  }
}

async function handlePairing(ws: ServerWebSocket<WsData>, msg: WsMessage): Promise<void> {
  if (msg.type !== 'pair:request') {
    sendPlain(ws, { type: 'pair:reject', reason: 'Expected pair:request' })
    ws.close()
    return
  }

  const { publicKey: peerPublicKey, nonceSig } = msg

  // Verify the nonce was a valid active pairing session
  if (!validatePairingNonce(nonceSig)) {
    sendPlain(ws, { type: 'pair:reject', reason: 'Invalid or expired pairing nonce' })
    ws.close()
    return
  }

  // Derive shared secret via ECDH
  const identity = getOrCreateIdentity()
  const sharedSecret = deriveSharedSecret(identity.privateKey, peerPublicKey)

  // Assign device ID
  const deviceId = crypto.randomUUID()

  // Store paired device
  addPairedDevice({
    id: deviceId,
    name: `device-${deviceId.slice(0, 8)}`,
    publicKey: peerPublicKey,
    sharedSecret: btoa(String.fromCharCode(...sharedSecret.key)),
    pairedAt: Date.now(),
    lastSeen: Date.now(),
    permission: 'full',
  })

  // Send accept with our public key
  sendPlain(ws, {
    type: 'pair:accept',
    publicKey: identity.publicKey,
    deviceId,
  })

  // Activate encryption for this connection
  ws.data.sharedSecret = sharedSecret
  ws.data.deviceId = deviceId
  ws.data.authenticated = true
}

async function handleKeypairAuth(ws: ServerWebSocket<WsData>, msg: WsMessage): Promise<void> {
  if (msg.type !== 'auth:response') {
    console.log(`[warren] handleKeypairAuth: unexpected msg type ${msg.type}`)
    sendPlain(ws, { type: 'auth:failure', reason: 'Expected auth:response' })
    return
  }

  console.log(`[warren] handleKeypairAuth: deviceId=${msg.deviceId.slice(0, 8)}`)

  const device = getPairedDevice(msg.deviceId)
  if (!device) {
    console.log('[warren] handleKeypairAuth: device not found')
    sendPlain(ws, { type: 'auth:failure', reason: 'Unknown device' })
    ws.close()
    return
  }

  console.log(
    `[warren] handleKeypairAuth: device found, sharedSecret length=${device.sharedSecret.length}`,
  )

  if (device.permission === 'revoked') {
    sendPlain(ws, { type: 'auth:failure', reason: 'Device access revoked' })
    ws.close()
    return
  }

  // Reconstruct shared secret from stored base64
  const sharedSecret = secretFromBase64(device.sharedSecret)

  // Verify HMAC of nonce
  console.log(`[warren] handleKeypairAuth: verifying HMAC, nonce=${ws.data.nonce.slice(0, 8)}`)
  const valid = await verifyChallenge(ws.data.nonce, msg.signature, sharedSecret)
  console.log(`[warren] handleKeypairAuth: HMAC valid=${valid}`)
  if (!valid) {
    sendPlain(ws, { type: 'auth:failure', reason: 'Invalid signature' })
    ws.close()
    return
  }

  // Auth success
  ws.data.authenticated = true
  ws.data.deviceId = msg.deviceId
  ws.data.sharedSecret = sharedSecret
  updateDeviceLastSeen(msg.deviceId)
  sendPlain(ws, { type: 'auth:success' })
  console.log('[warren] handleKeypairAuth: auth:success sent')
}

function handleTokenAuth(ws: ServerWebSocket<WsData>, msg: WsMessage): void {
  if (msg.type !== 'auth:response') {
    sendPlain(ws, { type: 'auth:failure', reason: 'Expected auth:response' })
    return
  }

  if (validateToken(msg.signature, ws.data.token)) {
    ws.data.authenticated = true
    ws.data.deviceId = msg.deviceId
    sendPlain(ws, { type: 'auth:success' })
  } else {
    sendPlain(ws, { type: 'auth:failure', reason: 'Invalid token' })
    ws.close()
  }
}

async function handleMessage(ws: ServerWebSocket<WsData>, raw: string): Promise<void> {
  const msg = await unwrapMessage(ws, raw)
  if (!msg) return

  // Pre-auth gate
  if (!ws.data.authenticated) {
    switch (ws.data.authMode) {
      case 'pair':
        await handlePairing(ws, msg)
        return
      case 'keypair':
        await handleKeypairAuth(ws, msg)
        return
      case 'token':
        handleTokenAuth(ws, msg)
        return
    }
  }

  // Post-auth message routing
  switch (msg.type) {
    case 'ping':
      await sendSecure(ws, { type: 'pong' })
      break

    case 'session:create': {
      const session = ptyManager.createSession(msg.shell)
      session.deviceId = ws.data.deviceId
      await sendSecure(ws, { type: 'session:created', session })

      ptyManager.onData(session.id, (data) => {
        sendSecure(ws, { type: 'terminal:data', sessionId: session.id, data })
      })

      ptyManager.onExit(session.id, (_code) => {
        sendSecure(ws, { type: 'session:ended', sessionId: session.id })
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
      await sendSecure(ws, { type: 'session:ended', sessionId: msg.sessionId })
      break
    }

    default:
      break
  }
}

// ---------------------------------------------------------------------------
// Server entry point
// ---------------------------------------------------------------------------

export function startServer(options: ServerOptions) {
  const config = options.config ?? loadConfig()
  const port = options.port ?? config.port ?? 9470
  const staticDir = options.staticDir ?? null
  const serverToken = options.token ?? ''

  const server = Bun.serve<WsData>({
    port,

    async fetch(req, server) {
      const url = new URL(req.url)

      // CORS preflight — needed for WebKit webviews fetching from views:// origin
      if (req.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        })
      }

      // WebSocket upgrade
      if (url.pathname === '/ws') {
        const token = url.searchParams.get('token')
        const deviceId = url.searchParams.get('deviceId')
        const pair = url.searchParams.get('pair')

        // Determine auth mode from query parameters
        let authMode: AuthMode = 'token'
        if (pair === 'true') {
          authMode = 'pair'
        } else if (deviceId) {
          authMode = 'keypair'
        }

        const upgraded = server.upgrade(req, {
          data: {
            deviceId: deviceId ?? '',
            authenticated: false,
            authMode,
            token: token ?? serverToken,
            nonce: '',
            sharedSecret: null,
          },
        })

        if (!upgraded) {
          return new Response('WebSocket upgrade failed', { status: 400 })
        }

        return undefined
      }

      // Pair start endpoint — generates a QR code + PIN for the pairing flow
      if (url.pathname === '/api/pair/start') {
        const identity = getOrCreateIdentity()
        const session = await startPairing(port, identity.publicKey)
        // Use server port if staticDir present (production), else 3999 (dev with separate Vite)
        const webPort = staticDir ? port : 3999
        const hostIp = session.qrPayload.host.split(':')[0]
        const pairUrl = `http://${hostIp}:${webPort}/pair?host=${encodeURIComponent(session.qrPayload.host)}&nonce=${encodeURIComponent(session.qrPayload.nonce)}&publicKey=${encodeURIComponent(session.qrPayload.publicKey)}&pin=${encodeURIComponent(session.pin)}&version=0.2`
        const qrSvg = await generateQrSvg(pairUrl)
        return new Response(
          JSON.stringify({ pin: session.pin, expiresAt: session.expiresAt, pairUrl, qrSvg }),
          { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } },
        )
      }

      // Sessions list endpoint
      if (url.pathname === '/api/sessions') {
        const sessions = ptyManager.listSessions()
        return new Response(JSON.stringify(sessions), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }

      // Kill session endpoint
      if (req.method === 'DELETE' && url.pathname.startsWith('/api/sessions/')) {
        const id = url.pathname.slice('/api/sessions/'.length)
        ptyManager.killSession(id)
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }

      // Paired devices endpoint
      if (url.pathname === '/api/devices') {
        const { listPairedDevices } = await import('./devices')
        const devices = listPairedDevices().map((d) => ({
          id: d.id,
          name: d.name,
          pairedAt: d.pairedAt,
          lastSeen: d.lastSeen,
          permission: d.permission,
        }))
        return new Response(JSON.stringify(devices), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }

      // Revoke paired device — set permission to revoked and kill active sessions
      if (
        req.method === 'PATCH' &&
        url.pathname.startsWith('/api/devices/') &&
        url.pathname.endsWith('/revoke')
      ) {
        const id = url.pathname.slice('/api/devices/'.length, -'/revoke'.length)
        const { revokeDevice } = await import('./devices')
        revokeDevice(id)
        for (const s of ptyManager.listSessions().filter((s) => s.deviceId === id)) {
          ptyManager.killSession(s.id)
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }

      // Delete paired device — also kill all active sessions for that device
      if (req.method === 'DELETE' && url.pathname.startsWith('/api/devices/')) {
        const id = url.pathname.slice('/api/devices/'.length)
        const { removePairedDevice } = await import('./devices')
        removePairedDevice(id)
        for (const s of ptyManager.listSessions().filter((s) => s.deviceId === id)) {
          ptyManager.killSession(s.id)
        }
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }

      // Discover other Warren nodes on the LAN
      if (url.pathname === '/api/discover') {
        const nodes = await discoverOnce(3000)
        return new Response(JSON.stringify(nodes), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
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
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        })
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
        if (ws.data.authMode === 'pair') {
          // Pairing mode: no challenge needed, wait for pair:request
          return
        }

        // Token and keypair modes: send auth challenge
        const nonce = crypto.randomUUID()
        ws.data.nonce = nonce
        sendPlain(ws, { type: 'auth:challenge', nonce })
      },

      message(ws, message) {
        handleMessage(ws, message.toString()).catch((err) => {
          console.error('[warren] Unhandled error in message handler:', err)
        })
      },

      close(ws) {
        // Kill all sessions owned by this device
        const deviceSessions = ptyManager
          .listSessions()
          .filter((s) => s.deviceId === ws.data.deviceId)
        for (const session of deviceSessions) {
          ptyManager.killSession(session.id)
        }
      },
    },
  })

  // Advertise via mDNS on the local network
  if (config.hostMode) {
    advertise({
      version: VERSION,
      nodeId: config.nodeId,
      hostName: config.nodeId.slice(0, 8),
      hostMode: config.hostMode,
      port,
    })
  }

  console.log(`Warren server running on ws://localhost:${port}/ws`)
  console.log(`Health: http://localhost:${port}/health`)

  // Wrap the server to clean up mDNS on stop
  const originalStop = server.stop.bind(server)
  server.stop = async (closeActiveConnections?: boolean) => {
    destroyDiscovery()
    await originalStop(closeActiveConnections)
  }

  return server
}
