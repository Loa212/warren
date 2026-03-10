// Pairing flow orchestrator — manages QR code display and nonce lifecycle
//
// The host calls startPairing() to generate a QR code + PIN.
// The controller scans the QR and connects via WebSocket with ?pair=true.
// The nonce is single-use and expires after 5 minutes.

import { networkInterfaces } from 'node:os'
import type { QrPayload } from '@warren/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PairingSession {
  nonce: string
  qrPayload: QrPayload
  pin: string // 6-digit numeric PIN derived from nonce
  expiresAt: number
}

// ---------------------------------------------------------------------------
// Active pairing sessions (in-memory, single-use)
// ---------------------------------------------------------------------------

const activeSessions = new Map<string, PairingSession>()

const PAIRING_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ---------------------------------------------------------------------------
// LAN IP detection
// ---------------------------------------------------------------------------

function getLanIp(): string {
  const interfaces = networkInterfaces()
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue
    for (const addr of iface) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address
      }
    }
  }
  return '127.0.0.1'
}

// ---------------------------------------------------------------------------
// PIN derivation — first 6 decimal digits of SHA-256(nonce)
// ---------------------------------------------------------------------------

async function derivePin(nonce: string): Promise<string> {
  const data = new TextEncoder().encode(nonce)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const view = new DataView(hash)
  // Take first 4 bytes as uint32, mod 1_000_000 for 6 digits
  const num = view.getUint32(0) % 1_000_000
  return num.toString().padStart(6, '0')
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function startPairing(port: number, hostPublicKey: string): Promise<PairingSession> {
  const nonce = crypto.randomUUID()
  const host = `${getLanIp()}:${port}`

  const qrPayload: QrPayload = {
    host,
    nonce,
    publicKey: hostPublicKey,
    version: '0.2',
  }

  const pin = await derivePin(nonce)

  const session: PairingSession = {
    nonce,
    qrPayload,
    pin,
    expiresAt: Date.now() + PAIRING_TTL_MS,
  }

  activeSessions.set(nonce, session)

  // Auto-cleanup after TTL
  setTimeout(() => {
    activeSessions.delete(nonce)
  }, PAIRING_TTL_MS)

  return session
}

export function validatePairingNonce(nonce: string): boolean {
  const session = activeSessions.get(nonce)
  if (!session) return false
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(nonce)
    return false
  }
  // Single-use: consume the nonce
  activeSessions.delete(nonce)
  return true
}

export function cancelPairing(nonce: string): void {
  activeSessions.delete(nonce)
}

export function getActivePairingSessions(): PairingSession[] {
  // Clean expired
  const now = Date.now()
  for (const [key, session] of activeSessions) {
    if (now > session.expiresAt) activeSessions.delete(key)
  }
  return [...activeSessions.values()]
}
