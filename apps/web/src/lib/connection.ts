// Connection manager — saved hosts in localStorage
//
// v0.2: Supports keypair-based auth alongside v0.1 token auth.

import { uuid } from './utils'

export interface SavedHost {
  id: string
  name: string
  address: string
  token: string
  lastConnected?: number
  // v0.2 keypair auth fields (optional — absent for v0.1 hosts)
  publicKey?: string // host's X25519 public key (base64)
  devicePublicKey?: string // this device's public key for this host (base64)
  devicePrivateKey?: string // this device's private key for this host (base64)
  sharedSecret?: string // derived shared secret (base64)
  authVersion?: 'v1' | 'v2'
  deviceId?: string // server-assigned after pairing
}

const STORAGE_KEY = 'warren:hosts'

export function getHosts(): SavedHost[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as SavedHost[]
  } catch {
    return []
  }
}

export function addHost(host: Omit<SavedHost, 'id'>): SavedHost {
  const hosts = getHosts()
  const newHost: SavedHost = { ...host, id: uuid() }
  hosts.push(newHost)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hosts))
  return newHost
}

export function removeHost(id: string): void {
  const hosts = getHosts().filter((h) => h.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(hosts))
}

export function updateHostLastConnected(id: string): void {
  const hosts = getHosts()
  const host = hosts.find((h) => h.id === id)
  if (host) {
    host.lastConnected = Date.now()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hosts))
  }
}

export function updateHost(id: string, updates: Partial<SavedHost>): void {
  const hosts = getHosts()
  const host = hosts.find((h) => h.id === id)
  if (host) {
    Object.assign(host, updates)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hosts))
  }
}
