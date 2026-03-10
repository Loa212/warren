// Device trust storage tests
// Run: bun test

import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { PairedDevice } from '@warren/types'
import {
  _setDevicesDirForTesting,
  addDevice,
  getDevice,
  listDevices,
  removeDevice,
  revokeDevice,
  updateLastSeen,
} from '../devices'

function makeDevice(overrides: Partial<PairedDevice> = {}): PairedDevice {
  return {
    id: crypto.randomUUID(),
    name: 'Test Device',
    publicKey: 'dGVzdC1rZXk=',
    pairedAt: Date.now(),
    lastSeen: Date.now(),
    permission: 'full',
    ...overrides,
  }
}

describe('Device Storage', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'warren-test-'))
    _setDevicesDirForTesting(tempDir)
  })

  afterEach(() => {
    _setDevicesDirForTesting(null)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('should return empty list when no devices file exists', () => {
    expect(listDevices()).toEqual([])
  })

  it('should add a device and retrieve it by id', () => {
    const device = makeDevice({ name: 'MacBook Pro' })
    addDevice(device)

    const found = getDevice(device.id)
    expect(found).toBeDefined()
    expect(found?.id).toBe(device.id)
    expect(found?.name).toBe('MacBook Pro')
    expect(found?.permission).toBe('full')
  })

  it('should list all added devices', () => {
    const d1 = makeDevice({ name: 'Device 1' })
    const d2 = makeDevice({ name: 'Device 2' })
    addDevice(d1)
    addDevice(d2)

    const all = listDevices()
    expect(all.length).toBe(2)
    expect(all.map((d) => d.name)).toContain('Device 1')
    expect(all.map((d) => d.name)).toContain('Device 2')
  })

  it('should update lastSeen timestamp', () => {
    const device = makeDevice({ lastSeen: 1000 })
    addDevice(device)

    const before = Date.now()
    const updated = updateLastSeen(device.id)
    expect(updated).toBeDefined()
    expect(updated?.lastSeen).toBeGreaterThanOrEqual(before)
  })

  it('should revoke a device', () => {
    const device = makeDevice()
    addDevice(device)

    const revoked = revokeDevice(device.id)
    expect(revoked).toBeDefined()
    expect(revoked?.permission).toBe('revoked')

    // Verify persisted
    const found = getDevice(device.id)
    expect(found?.permission).toBe('revoked')
  })

  it('should remove a device completely', () => {
    const device = makeDevice()
    addDevice(device)
    expect(listDevices().length).toBe(1)

    const removed = removeDevice(device.id)
    expect(removed).toBe(true)
    expect(listDevices().length).toBe(0)
  })

  it('should upsert when adding a device with existing id', () => {
    const device = makeDevice({ name: 'Original' })
    addDevice(device)

    const updated = { ...device, name: 'Updated' }
    addDevice(updated)

    const all = listDevices()
    expect(all.length).toBe(1)
    expect(all[0]?.name).toBe('Updated')
  })

  it('should return undefined for non-existent device id', () => {
    expect(getDevice('nonexistent')).toBeUndefined()
    expect(updateLastSeen('nonexistent')).toBeUndefined()
    expect(revokeDevice('nonexistent')).toBeUndefined()
  })

  it('should return false when removing non-existent device', () => {
    expect(removeDevice('nonexistent')).toBe(false)
  })

  it('should handle corrupted devices.json gracefully', () => {
    writeFileSync(join(tempDir, 'devices.json'), '{not valid json!!!')

    // Should return empty array, not throw
    expect(listDevices()).toEqual([])
  })
})
