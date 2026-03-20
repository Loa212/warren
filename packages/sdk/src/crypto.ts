// Cryptographic utilities for the SDK
//
// Uses @noble/ciphers + @noble/hashes for synchronous, cross-platform crypto.
// No crypto.subtle required — works in Bun, Node.js, and browsers.

import { gcm } from '@noble/ciphers/aes.js'
import { x25519 } from '@noble/curves/ed25519.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import type { EncryptedPayload } from '@warren/types'
import type { SharedSecretRef } from './types'

// ---------------------------------------------------------------------------
// Base64 helpers
// ---------------------------------------------------------------------------

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ---------------------------------------------------------------------------
// HKDF constants — must match packages/core/src/crypto.ts
// ---------------------------------------------------------------------------

const HKDF_SALT = new TextEncoder().encode('warren-v0.2')
const HKDF_INFO = new TextEncoder().encode('ecdh-shared-secret')

// ---------------------------------------------------------------------------
// HMAC-SHA256 — synchronous challenge signing for reconnection auth
// ---------------------------------------------------------------------------

/** Sign a nonce with HMAC-SHA256 using the shared secret. */
export function hmacSign(nonce: string, secret: SharedSecretRef): string {
  const data = new TextEncoder().encode(nonce)
  const sig = hmac(sha256, secret.key, data)
  return toBase64(sig)
}

// ---------------------------------------------------------------------------
// AES-256-GCM — synchronous encrypt/decrypt
// ---------------------------------------------------------------------------

/** Encrypt a string payload with AES-256-GCM. */
export function encryptPayload(data: string, secret: SharedSecretRef): EncryptedPayload {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(data)
  const encrypted = gcm(secret.key, iv).encrypt(encoded)
  return { ciphertext: toBase64(encrypted), iv: toBase64(iv), algorithm: 'AES-GCM' }
}

/** Decrypt an AES-256-GCM encrypted payload. */
export function decryptPayload(encrypted: EncryptedPayload, secret: SharedSecretRef): string {
  const iv = fromBase64(encrypted.iv)
  const ciphertext = fromBase64(encrypted.ciphertext)
  const decrypted = gcm(secret.key, iv).decrypt(ciphertext)
  return new TextDecoder().decode(decrypted)
}

// ---------------------------------------------------------------------------
// X25519 ECDH — for pairing flow
// ---------------------------------------------------------------------------

export interface KeyPair {
  publicKeyB64: string
  privateKey: Uint8Array
}

/** Generate an ephemeral X25519 key pair for pairing. */
export function generateKeyPair(): KeyPair {
  const privateKey = x25519.utils.randomSecretKey()
  return {
    publicKeyB64: toBase64(x25519.getPublicKey(privateKey)),
    privateKey,
  }
}

/** Derive a shared secret from an X25519 key exchange. Returns base64-encoded secret. */
export function deriveSharedSecret(privateKey: Uint8Array, peerPublicKeyB64: string): string {
  const rawSecret = x25519.getSharedSecret(privateKey, fromBase64(peerPublicKeyB64))
  return toBase64(hkdf(sha256, rawSecret, HKDF_SALT, HKDF_INFO, 32))
}
