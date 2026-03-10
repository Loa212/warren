// Device trust store — reads/writes ~/.warren/devices.json
//
// Stores this node's identity keypair and all paired devices.
// Follows the same pattern as config.ts (JSON, atomic write, 0o600).

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getConfigDir } from './config'
import type { KeyPair } from './crypto'
import { generateKeyPair } from './crypto'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StoredDevice {
  id: string
  name: string
  publicKey: string // peer's X25519 public key (base64)
  sharedSecret: string // derived shared secret (base64)
  pairedAt: number
  lastSeen: number
  permission: 'full' | 'revoked'
}

export interface DeviceStore {
  identity: {
    publicKey: string // base64
    privateKey: string // base64
    createdAt: number
  }
  devices: StoredDevice[]
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DEVICES_FILE = 'devices.json'

export function getDeviceStorePath(): string {
  return join(getConfigDir(), DEVICES_FILE)
}

// ---------------------------------------------------------------------------
// Read / Write
// ---------------------------------------------------------------------------

function createDefaultStore(): DeviceStore {
  const kp = generateKeyPair()
  return {
    identity: {
      publicKey: kp.publicKey,
      privateKey: kp.privateKey,
      createdAt: Date.now(),
    },
    devices: [],
  }
}

export function loadDeviceStore(): DeviceStore {
  const path = getDeviceStorePath()

  if (!existsSync(path)) {
    const store = createDefaultStore()
    saveDeviceStore(store)
    return store
  }

  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw)

    // Migrate from v0.1 format (flat array of devices) to v0.2 format
    if (Array.isArray(parsed)) {
      const store = createDefaultStore()
      // Old devices don't have sharedSecret, add empty placeholder
      store.devices = parsed.map((d: Record<string, unknown>) => ({
        ...d,
        sharedSecret: (d.sharedSecret as string) ?? '',
      })) as StoredDevice[]
      saveDeviceStore(store)
      return store
    }

    // Validate v0.2 structure has required fields
    if (!parsed.identity || !parsed.devices) {
      const store = createDefaultStore()
      saveDeviceStore(store)
      return store
    }

    return parsed as DeviceStore
  } catch {
    console.warn('[warren] Failed to parse devices.json, creating new store')
    const store = createDefaultStore()
    saveDeviceStore(store)
    return store
  }
}

export function saveDeviceStore(store: DeviceStore): void {
  const path = getDeviceStorePath()
  writeFileSync(path, JSON.stringify(store, null, 2), { mode: 0o600 })
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export function getOrCreateIdentity(): KeyPair {
  const store = loadDeviceStore()
  return {
    publicKey: store.identity.publicKey,
    privateKey: store.identity.privateKey,
  }
}

// ---------------------------------------------------------------------------
// Device CRUD
// ---------------------------------------------------------------------------

export function addPairedDevice(device: StoredDevice): void {
  const store = loadDeviceStore()
  // Replace if already exists (re-pairing)
  store.devices = store.devices.filter((d) => d.id !== device.id)
  store.devices.push(device)
  saveDeviceStore(store)
}

export function getPairedDevice(deviceId: string): StoredDevice | undefined {
  const store = loadDeviceStore()
  return store.devices.find((d) => d.id === deviceId)
}

export function getPairedDeviceByPublicKey(publicKey: string): StoredDevice | undefined {
  const store = loadDeviceStore()
  return store.devices.find((d) => d.publicKey === publicKey)
}

export function updateDeviceLastSeen(deviceId: string): void {
  const store = loadDeviceStore()
  const device = store.devices.find((d) => d.id === deviceId)
  if (device) {
    device.lastSeen = Date.now()
    saveDeviceStore(store)
  }
}

export function revokeDevice(deviceId: string): void {
  const store = loadDeviceStore()
  const device = store.devices.find((d) => d.id === deviceId)
  if (device) {
    device.permission = 'revoked'
    saveDeviceStore(store)
  }
}

export function removePairedDevice(deviceId: string): void {
  const store = loadDeviceStore()
  store.devices = store.devices.filter((d) => d.id !== deviceId)
  saveDeviceStore(store)
}

export function listPairedDevices(): StoredDevice[] {
  const store = loadDeviceStore()
  return store.devices
}
