// Cryptographic primitives for Warren v0.2
//
// X25519 ECDH key exchange + AES-256-GCM encrypted transport
// Uses @noble/curves for X25519 (not in Web Crypto standard)
// Uses Web Crypto API for AES-GCM (available in Bun + browser)

import { x25519 } from '@noble/curves/ed25519.js'
import { hkdf } from '@noble/hashes/hkdf.js'
import { sha256 } from '@noble/hashes/sha2.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KeyPair {
  publicKey: string // base64
  privateKey: string // base64
}

export interface SharedSecret {
  key: Uint8Array // 32 bytes (AES-256)
  algorithm: 'ECDH-X25519'
}

export interface EncryptedPayload {
  ciphertext: string // base64
  iv: string // base64
  algorithm: 'AES-GCM'
}

// ---------------------------------------------------------------------------
// Helpers — base64 encoding/decoding
// ---------------------------------------------------------------------------

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ---------------------------------------------------------------------------
// HKDF constants
// ---------------------------------------------------------------------------

const HKDF_SALT = new TextEncoder().encode('warren-v0.2')
const HKDF_INFO = new TextEncoder().encode('ecdh-shared-secret')

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

export function generateKeyPair(): KeyPair {
  const privateKey = x25519.utils.randomSecretKey()
  const publicKey = x25519.getPublicKey(privateKey)
  return {
    publicKey: toBase64(publicKey),
    privateKey: toBase64(privateKey),
  }
}

// ---------------------------------------------------------------------------
// ECDH shared secret derivation
// ---------------------------------------------------------------------------

export function deriveSharedSecret(privateKey: string, peerPublicKey: string): SharedSecret {
  const privBytes = fromBase64(privateKey)
  const pubBytes = fromBase64(peerPublicKey)

  // Raw X25519 ECDH
  const rawSecret = x25519.getSharedSecret(privBytes, pubBytes)

  // HKDF to derive a proper 256-bit AES key
  const derived = hkdf(sha256, rawSecret, HKDF_SALT, HKDF_INFO, 32)

  return {
    key: derived,
    algorithm: 'ECDH-X25519',
  }
}

// ---------------------------------------------------------------------------
// AES-256-GCM encryption
// ---------------------------------------------------------------------------

export async function encrypt(data: string, secret: SharedSecret): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(data)

  const key = await crypto.subtle.importKey(
    'raw',
    secret.key as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  return {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
    algorithm: 'AES-GCM',
  }
}

// ---------------------------------------------------------------------------
// AES-256-GCM decryption
// ---------------------------------------------------------------------------

export async function decrypt(encrypted: EncryptedPayload, secret: SharedSecret): Promise<string> {
  const iv = fromBase64(encrypted.iv)
  const ciphertext = fromBase64(encrypted.ciphertext)

  const key = await crypto.subtle.importKey(
    'raw',
    secret.key as BufferSource,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  )

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  )

  return new TextDecoder().decode(plaintext)
}

// ---------------------------------------------------------------------------
// HMAC-SHA256 challenge signing (for reconnection auth)
// ---------------------------------------------------------------------------

export async function signChallenge(nonce: string, secret: SharedSecret): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    secret.key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const data = new TextEncoder().encode(nonce)
  const signature = await crypto.subtle.sign('HMAC', key, data)

  return toBase64(new Uint8Array(signature))
}

export async function verifyChallenge(
  nonce: string,
  signature: string,
  secret: SharedSecret,
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    'raw',
    secret.key as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  )

  const data = new TextEncoder().encode(nonce)
  const sigBytes = fromBase64(signature)

  return crypto.subtle.verify('HMAC', key, sigBytes as BufferSource, data)
}

// ---------------------------------------------------------------------------
// Utility exports (for serialization)
// ---------------------------------------------------------------------------

export function secretToBase64(secret: SharedSecret): string {
  return toBase64(secret.key)
}

export function secretFromBase64(b64: string): SharedSecret {
  return {
    key: fromBase64(b64),
    algorithm: 'ECDH-X25519',
  }
}

export { toBase64, fromBase64 }
