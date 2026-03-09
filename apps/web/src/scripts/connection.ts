// Connection manager — manages saved host connections

export interface SavedHost {
  id: string
  name: string
  address: string // host:port
  token: string
  lastConnected?: number
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
  const newHost: SavedHost = { ...host, id: crypto.randomUUID() }
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
