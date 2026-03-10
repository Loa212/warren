// Device trust storage — reads/writes ~/.warren/devices.json
//
// v1: JSON file storage (mirrors config.ts pattern)
// v2 TODO: Migrate to SQLite for transactional safety + shared secret storage

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { PairedDevice } from '@warren/types'
import { getConfigDir } from './config'

const DEVICES_FILE_NAME = 'devices.json'

// Test-only override for the devices directory
let devicesDir: string | null = null

/** @internal Override the devices directory for testing. Pass null to reset. */
export function _setDevicesDirForTesting(dir: string | null): void {
  devicesDir = dir
}

function getDevicesPath(): string {
  const dir = devicesDir ?? getConfigDir()
  return join(dir, DEVICES_FILE_NAME)
}

function loadDevicesFile(): PairedDevice[] {
  const path = getDevicesPath()
  if (!existsSync(path)) return []
  try {
    const raw = readFileSync(path, 'utf-8')
    return JSON.parse(raw) as PairedDevice[]
  } catch {
    console.warn(`[warren] Failed to parse devices at ${path}, returning empty list`)
    return []
  }
}

function saveDevicesFile(devices: PairedDevice[]): void {
  const path = getDevicesPath()
  writeFileSync(path, JSON.stringify(devices, null, 2), { mode: 0o600 })
}

// ---------------------------------------------------------------------------
// Public CRUD API
// ---------------------------------------------------------------------------

export function listDevices(): PairedDevice[] {
  return loadDevicesFile()
}

export function getDevice(id: string): PairedDevice | undefined {
  return loadDevicesFile().find((d) => d.id === id)
}

/** Upsert — adds a new device or replaces an existing one with the same ID. */
export function addDevice(device: PairedDevice): void {
  const devices = loadDevicesFile()
  const idx = devices.findIndex((d) => d.id === device.id)
  if (idx !== -1) {
    devices[idx] = device
  } else {
    devices.push(device)
  }
  saveDevicesFile(devices)
}

export function updateLastSeen(id: string): PairedDevice | undefined {
  const devices = loadDevicesFile()
  const device = devices.find((d) => d.id === id)
  if (!device) return undefined
  device.lastSeen = Date.now()
  saveDevicesFile(devices)
  return device
}

export function revokeDevice(id: string): PairedDevice | undefined {
  const devices = loadDevicesFile()
  const device = devices.find((d) => d.id === id)
  if (!device) return undefined
  device.permission = 'revoked'
  // TODO(v0.2): clear shared secret from encrypted store
  saveDevicesFile(devices)
  return device
}

export function removeDevice(id: string): boolean {
  const devices = loadDevicesFile()
  const filtered = devices.filter((d) => d.id !== id)
  if (filtered.length === devices.length) return false
  saveDevicesFile(filtered)
  return true
}
