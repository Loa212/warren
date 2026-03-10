// Authentication module
//
// v0.1: Static token auth (simple, functional)
// v0.2 TODO: X25519 ECDH key exchange + encrypted transport
//   - Use Web Crypto API (available in Bun) for key generation
//   - ECDH key exchange during pairing
//   - Derive shared secret, store in device trust DB (SQLite)
//   - All subsequent WsMessages encrypted with AES-GCM using shared secret

// ---------------------------------------------------------------------------
// v0.1: Token-based auth (working)
// ---------------------------------------------------------------------------

export function generateToken(): string {
  return crypto.randomUUID()
}

export function validateToken(provided: string, expected: string): boolean {
  // Constant-time comparison to prevent timing attacks
  if (provided.length !== expected.length) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return result === 0
}

// ---------------------------------------------------------------------------
// v0.2 stubs: X25519 ECDH key exchange
// ---------------------------------------------------------------------------

export interface KeyPair {
  publicKey: string // base64
  privateKey: string // base64
}

export interface SharedSecret {
  key: Uint8Array
  algorithm: 'ECDH-X25519'
}

export interface EncryptedPayload {
  ciphertext: string // base64
  iv: string // base64
  algorithm: 'AES-GCM'
}

/**
 * TODO(v0.2): Generate X25519 key pair for a node.
 *
 * Implementation plan:
 *   const { publicKey, privateKey } = await crypto.subtle.generateKey(
 *     { name: 'ECDH', namedCurve: 'X25519' },  // X25519 not yet in SubtleCrypto standard
 *     true,
 *     ['deriveKey', 'deriveBits']
 *   )
 *   Or use @noble/curves: import { x25519 } from '@noble/curves/ed25519'
 *   const priv = x25519.utils.randomPrivateKey()
 *   const pub = x25519.getPublicKey(priv)
 */
export function generateKeyPair(): KeyPair {
  throw new Error('TODO(v0.2): generateKeyPair not implemented — requires X25519 support')
}

/**
 * TODO(v0.2): Derive shared secret using ECDH.
 * Both sides compute the same secret without transmitting it.
 */
export function deriveSharedSecret(_privateKey: string, _peerPublicKey: string): SharedSecret {
  throw new Error('TODO(v0.2): deriveSharedSecret not implemented')
}

/**
 * TODO(v0.2): Encrypt terminal data with AES-GCM using derived shared secret.
 */
export function encrypt(_data: string, _secret: SharedSecret): EncryptedPayload {
  throw new Error('TODO(v0.2): encrypt not implemented')
}

/**
 * TODO(v0.2): Decrypt encrypted payload.
 */
export function decrypt(_encrypted: EncryptedPayload, _secret: SharedSecret): string {
  throw new Error('TODO(v0.2): decrypt not implemented')
}
