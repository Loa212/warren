import { describe, expect, test } from 'bun:test'
import {
  decryptPayload,
  deriveSharedSecret,
  encryptPayload,
  fromBase64,
  generateKeyPair,
  hmacSign,
  toBase64,
} from '../crypto'
import type { SharedSecretRef } from '../types'

describe('base64', () => {
  test('round-trips bytes', () => {
    const original = new Uint8Array([0, 1, 127, 128, 255])
    const encoded = toBase64(original)
    const decoded = fromBase64(encoded)
    expect(decoded).toEqual(original)
  })
})

describe('hmacSign', () => {
  test('produces consistent signatures', () => {
    const secret: SharedSecretRef = { key: crypto.getRandomValues(new Uint8Array(32)) }
    const sig1 = hmacSign('test-nonce', secret)
    const sig2 = hmacSign('test-nonce', secret)
    expect(sig1).toBe(sig2)
  })

  test('different nonces produce different signatures', () => {
    const secret: SharedSecretRef = { key: crypto.getRandomValues(new Uint8Array(32)) }
    const sig1 = hmacSign('nonce-a', secret)
    const sig2 = hmacSign('nonce-b', secret)
    expect(sig1).not.toBe(sig2)
  })
})

describe('encrypt / decrypt', () => {
  test('round-trips data', () => {
    const secret: SharedSecretRef = { key: crypto.getRandomValues(new Uint8Array(32)) }
    const plaintext = 'Hello, Warren!'
    const encrypted = encryptPayload(plaintext, secret)

    expect(encrypted.algorithm).toBe('AES-GCM')
    expect(encrypted.ciphertext).toBeTruthy()
    expect(encrypted.iv).toBeTruthy()

    const decrypted = decryptPayload(encrypted, secret)
    expect(decrypted).toBe(plaintext)
  })

  test('different IVs for same data', () => {
    const secret: SharedSecretRef = { key: crypto.getRandomValues(new Uint8Array(32)) }
    const e1 = encryptPayload('same', secret)
    const e2 = encryptPayload('same', secret)
    expect(e1.iv).not.toBe(e2.iv)
  })
})

describe('ECDH key exchange', () => {
  test('generateKeyPair returns base64 public key', () => {
    const kp = generateKeyPair()
    expect(kp.publicKeyB64).toBeTruthy()
    expect(kp.privateKey).toBeInstanceOf(Uint8Array)
    expect(kp.privateKey.length).toBe(32)
  })

  test('deriveSharedSecret produces matching secrets for both parties', () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()

    const secretA = deriveSharedSecret(alice.privateKey, bob.publicKeyB64)
    const secretB = deriveSharedSecret(bob.privateKey, alice.publicKeyB64)

    expect(secretA).toBe(secretB)
  })
})
