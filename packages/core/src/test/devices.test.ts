// Device trust store test suite
// Run: bun test

import { afterEach, describe, expect, it } from 'bun:test'
import { deriveSharedSecret, generateKeyPair, secretToBase64 } from '../crypto'
import {
  addPairedDevice,
  getOrCreateIdentity,
  getPairedDevice,
  getPairedDeviceByPublicKey,
  listPairedDevices,
  loadDeviceStore,
  removePairedDevice,
  revokeDevice,
  type StoredDevice,
  updateDeviceLastSeen,
} from '../devices'

describe('Device Store', () => {
  // Note: These tests use the real ~/.warren/ directory.
  // They add/remove test devices with a unique prefix to avoid conflicts.
  const testDeviceIds: string[] = []

  afterEach(() => {
    // Clean up test devices
    for (const id of testDeviceIds) {
      try {
        removePairedDevice(id)
      } catch {
        // Ignore if already removed
      }
    }
    testDeviceIds.length = 0
  })

  it('should get or create an identity keypair', () => {
    const identity = getOrCreateIdentity()
    expect(identity.publicKey).toBeString()
    expect(identity.privateKey).toBeString()
    expect(identity.publicKey.length).toBeGreaterThan(0)
    expect(identity.privateKey.length).toBeGreaterThan(0)
  })

  it('should return the same identity on subsequent calls', () => {
    const id1 = getOrCreateIdentity()
    const id2 = getOrCreateIdentity()
    expect(id1.publicKey).toBe(id2.publicKey)
    expect(id1.privateKey).toBe(id2.privateKey)
  })

  it('should add and retrieve a paired device', () => {
    const alice = generateKeyPair()
    const bob = generateKeyPair()
    const secret = deriveSharedSecret(alice.privateKey, bob.publicKey)

    const device: StoredDevice = {
      id: `test-device-${crypto.randomUUID()}`,
      name: 'Test Device',
      publicKey: bob.publicKey,
      sharedSecret: secretToBase64(secret),
      pairedAt: Date.now(),
      lastSeen: Date.now(),
      permission: 'full',
    }
    testDeviceIds.push(device.id)

    addPairedDevice(device)

    const retrieved = getPairedDevice(device.id)
    expect(retrieved).toBeDefined()
    expect(retrieved?.id).toBe(device.id)
    expect(retrieved?.name).toBe('Test Device')
    expect(retrieved?.publicKey).toBe(bob.publicKey)
    expect(retrieved?.permission).toBe('full')
  })

  it('should find a device by public key', () => {
    const bob = generateKeyPair()
    const secret = deriveSharedSecret(generateKeyPair().privateKey, bob.publicKey)

    const device: StoredDevice = {
      id: `test-device-${crypto.randomUUID()}`,
      name: 'Test Device PK',
      publicKey: bob.publicKey,
      sharedSecret: secretToBase64(secret),
      pairedAt: Date.now(),
      lastSeen: Date.now(),
      permission: 'full',
    }
    testDeviceIds.push(device.id)

    addPairedDevice(device)

    const found = getPairedDeviceByPublicKey(bob.publicKey)
    expect(found).toBeDefined()
    expect(found?.id).toBe(device.id)
  })

  it('should update lastSeen timestamp', () => {
    const device: StoredDevice = {
      id: `test-device-${crypto.randomUUID()}`,
      name: 'Test Update',
      publicKey: generateKeyPair().publicKey,
      sharedSecret: 'dGVzdA==',
      pairedAt: Date.now(),
      lastSeen: 1000,
      permission: 'full',
    }
    testDeviceIds.push(device.id)

    addPairedDevice(device)
    updateDeviceLastSeen(device.id)

    const updated = getPairedDevice(device.id)
    expect(updated?.lastSeen).toBeGreaterThan(1000)
  })

  it('should revoke a device', () => {
    const device: StoredDevice = {
      id: `test-device-${crypto.randomUUID()}`,
      name: 'Test Revoke',
      publicKey: generateKeyPair().publicKey,
      sharedSecret: 'dGVzdA==',
      pairedAt: Date.now(),
      lastSeen: Date.now(),
      permission: 'full',
    }
    testDeviceIds.push(device.id)

    addPairedDevice(device)
    revokeDevice(device.id)

    const revoked = getPairedDevice(device.id)
    expect(revoked?.permission).toBe('revoked')
  })

  it('should remove a device', () => {
    const device: StoredDevice = {
      id: `test-device-${crypto.randomUUID()}`,
      name: 'Test Remove',
      publicKey: generateKeyPair().publicKey,
      sharedSecret: 'dGVzdA==',
      pairedAt: Date.now(),
      lastSeen: Date.now(),
      permission: 'full',
    }

    addPairedDevice(device)
    removePairedDevice(device.id)

    const removed = getPairedDevice(device.id)
    expect(removed).toBeUndefined()
  })

  it('should list all paired devices', () => {
    const beforeCount = listPairedDevices().length

    const d1: StoredDevice = {
      id: `test-device-${crypto.randomUUID()}`,
      name: 'List Test 1',
      publicKey: generateKeyPair().publicKey,
      sharedSecret: 'dGVzdA==',
      pairedAt: Date.now(),
      lastSeen: Date.now(),
      permission: 'full',
    }
    const d2: StoredDevice = {
      id: `test-device-${crypto.randomUUID()}`,
      name: 'List Test 2',
      publicKey: generateKeyPair().publicKey,
      sharedSecret: 'dGVzdA==',
      pairedAt: Date.now(),
      lastSeen: Date.now(),
      permission: 'full',
    }
    testDeviceIds.push(d1.id, d2.id)

    addPairedDevice(d1)
    addPairedDevice(d2)

    const all = listPairedDevices()
    expect(all.length).toBeGreaterThanOrEqual(beforeCount + 2)
  })

  it('should replace device on re-pairing with same ID', () => {
    const id = `test-device-${crypto.randomUUID()}`
    testDeviceIds.push(id)

    addPairedDevice({
      id,
      name: 'Original',
      publicKey: generateKeyPair().publicKey,
      sharedSecret: 'dGVzdA==',
      pairedAt: Date.now(),
      lastSeen: Date.now(),
      permission: 'full',
    })

    addPairedDevice({
      id,
      name: 'Re-paired',
      publicKey: generateKeyPair().publicKey,
      sharedSecret: 'dGVzdA==',
      pairedAt: Date.now(),
      lastSeen: Date.now(),
      permission: 'full',
    })

    const device = getPairedDevice(id)
    expect(device?.name).toBe('Re-paired')
  })

  it('should load store structure correctly', () => {
    const store = loadDeviceStore()
    expect(store.identity).toBeDefined()
    expect(store.identity.publicKey).toBeString()
    expect(store.identity.privateKey).toBeString()
    expect(store.identity.createdAt).toBeNumber()
    expect(Array.isArray(store.devices)).toBe(true)
  })
})
