// Authentication module
//
// v0.1: Static token auth (kept for backward compatibility)
// v0.2: X25519 ECDH key exchange + AES-256-GCM encrypted transport

export type { EncryptedPayload, KeyPair, SharedSecret } from './crypto'
// Re-export v0.2 crypto primitives from crypto.ts
export {
  decrypt,
  deriveSharedSecret,
  encrypt,
  generateKeyPair,
  secretFromBase64,
  secretToBase64,
  signChallenge,
  verifyChallenge,
} from './crypto'

// ---------------------------------------------------------------------------
// v0.1: Token-based auth (kept for backward compatibility)
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
