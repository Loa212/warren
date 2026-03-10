// Crypto primitives test suite
// Run: bun test

import { describe, expect, it } from 'bun:test'
import {
  decrypt,
  deriveSharedSecret,
  encrypt,
  fromBase64,
  generateKeyPair,
  secretFromBase64,
  secretToBase64,
  signChallenge,
  toBase64,
  verifyChallenge,
} from '../crypto'

describe('generateKeyPair', () => {
  it('should return base64-encoded public and private keys', () => {
    const kp = generateKeyPair()
    expect(kp.publicKey).toBeString()
    expect(kp.privateKey).toBeString()

    // X25519 keys are 32 bytes
    const pub = fromBase64(kp.publicKey)
    const priv = fromBase64(kp.privateKey)
    expect(pub.length).toBe(32)
    expect(priv.length).toBe(32)
  })

  it('should generate unique key pairs each time', () => {
    const kp1 = generateKeyPair()
    const kp2 = generateKeyPair()
    expect(kp1.publicKey).not.toBe(kp2.publicKey)
    expect(kp1.privateKey).not.toBe(kp2.privateKey)
  })
})

describe('deriveSharedSecret', () => {
  it('should derive the same secret from both sides (ECDH symmetry)', () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()

    const secretAlice = deriveSharedSecret(alice.privateKey, bob.publicKey)
    const secretBob = deriveSharedSecret(bob.privateKey, alice.publicKey)

    expect(secretAlice.key).toEqual(secretBob.key)
    expect(secretAlice.algorithm).toBe('ECDH-X25519')
  })

  it('should produce a 32-byte key', () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()

    const secret = deriveSharedSecret(alice.privateKey, bob.publicKey)
    expect(secret.key.length).toBe(32)
  })

  it('should produce different secrets for different key pairs', () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()
    const charlie = generateKeyPair()

    const s1 = deriveSharedSecret(alice.privateKey, bob.publicKey)
    const s2 = deriveSharedSecret(alice.privateKey, charlie.publicKey)

    expect(s1.key).not.toEqual(s2.key)
  })
})

describe('encrypt / decrypt', () => {
  it('should round-trip correctly for ASCII text', async () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()
    const secret = deriveSharedSecret(alice.privateKey, bob.publicKey)

    const plaintext = 'Hello, Warren!'
    const encrypted = await encrypt(plaintext, secret)
    const decrypted = await decrypt(encrypted, secret)

    expect(decrypted).toBe(plaintext)
  })

  it('should round-trip correctly for Unicode text', async () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()
    const s = deriveSharedSecret(alice.privateKey, bob.publicKey)

    const plaintext = 'Unicode test: \u{1F430}\u{1F955} warren says hello \u00F1'
    const encrypted = await encrypt(plaintext, s)
    const decrypted = await decrypt(encrypted, s)

    expect(decrypted).toBe(plaintext)
  })

  it('should round-trip correctly for empty string', async () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()
    const secret = deriveSharedSecret(alice.privateKey, bob.publicKey)

    const encrypted = await encrypt('', secret)
    const decrypted = await decrypt(encrypted, secret)

    expect(decrypted).toBe('')
  })

  it('should round-trip correctly for large payloads', async () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()
    const secret = deriveSharedSecret(alice.privateKey, bob.publicKey)

    // Simulate large terminal output
    const plaintext = 'x'.repeat(100_000)
    const encrypted = await encrypt(plaintext, secret)
    const decrypted = await decrypt(encrypted, secret)

    expect(decrypted).toBe(plaintext)
  })

  it('should produce different ciphertexts for same plaintext (random IV)', async () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()
    const secret = deriveSharedSecret(alice.privateKey, bob.publicKey)

    const plaintext = 'same message'
    const e1 = await encrypt(plaintext, secret)
    const e2 = await encrypt(plaintext, secret)

    expect(e1.ciphertext).not.toBe(e2.ciphertext)
    expect(e1.iv).not.toBe(e2.iv)
  })

  it('should fail to decrypt with wrong key', async () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()
    const charlie = generateKeyPair()

    const secret1 = deriveSharedSecret(alice.privateKey, bob.publicKey)
    const secret2 = deriveSharedSecret(alice.privateKey, charlie.publicKey)

    const encrypted = await encrypt('secret message', secret1)

    await expect(decrypt(encrypted, secret2)).rejects.toThrow()
  })

  it('should have algorithm set to AES-GCM', async () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()
    const secret = deriveSharedSecret(alice.privateKey, bob.publicKey)

    const encrypted = await encrypt('test', secret)
    expect(encrypted.algorithm).toBe('AES-GCM')
  })
})

describe('signChallenge / verifyChallenge', () => {
  it('should verify a valid signature', async () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()
    const secret = deriveSharedSecret(alice.privateKey, bob.publicKey)

    const nonce = crypto.randomUUID()
    const signature = await signChallenge(nonce, secret)
    const valid = await verifyChallenge(nonce, signature, secret)

    expect(valid).toBe(true)
  })

  it('should reject a signature from a different secret', async () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()
    const charlie = generateKeyPair()

    const secret1 = deriveSharedSecret(alice.privateKey, bob.publicKey)
    const secret2 = deriveSharedSecret(alice.privateKey, charlie.publicKey)

    const nonce = crypto.randomUUID()
    const signature = await signChallenge(nonce, secret1)
    const valid = await verifyChallenge(nonce, signature, secret2)

    expect(valid).toBe(false)
  })

  it('should reject a signature for a different nonce', async () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()
    const secret = deriveSharedSecret(alice.privateKey, bob.publicKey)

    const sig = await signChallenge('nonce-1', secret)
    const valid = await verifyChallenge('nonce-2', sig, secret)

    expect(valid).toBe(false)
  })
})

describe('secretToBase64 / secretFromBase64', () => {
  it('should round-trip correctly', () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()
    const secret = deriveSharedSecret(alice.privateKey, bob.publicKey)

    const b64 = secretToBase64(secret)
    const restored = secretFromBase64(b64)

    expect(restored.key).toEqual(secret.key)
    expect(restored.algorithm).toBe('ECDH-X25519')
  })
})

describe('toBase64 / fromBase64', () => {
  it('should round-trip arbitrary bytes', () => {
    const original = new Uint8Array([0, 1, 127, 128, 255, 42])
    const b64 = toBase64(original)
    const restored = fromBase64(b64)
    expect(restored).toEqual(original)
  })
})
