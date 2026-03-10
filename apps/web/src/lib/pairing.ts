// Browser-side X25519 ECDH for the pairing flow.
// Mirrors packages/core/src/crypto.ts but runs in the browser via @noble/curves.
import { x25519 } from '@noble/curves/ed25519.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'

// Must match server-side constants in packages/core/src/crypto.ts
const HKDF_SALT = new TextEncoder().encode('warren-v0.2')
const HKDF_INFO = new TextEncoder().encode('ecdh-shared-secret')

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export interface EphemeralKeyPair {
  publicKeyB64: string
  privateKey: Uint8Array
}

export function generateEphemeralKeyPair(): EphemeralKeyPair {
  const privateKey = x25519.utils.randomSecretKey()
  return { publicKeyB64: toBase64(x25519.getPublicKey(privateKey)), privateKey }
}

export function deriveSharedSecretB64(privateKey: Uint8Array, peerPublicKeyB64: string): string {
  const rawSecret = x25519.getSharedSecret(privateKey, fromBase64(peerPublicKeyB64))
  return toBase64(hkdf(sha256, rawSecret, HKDF_SALT, HKDF_INFO, 32))
}
