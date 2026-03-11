// Dashboard API client — calls Warren's local HTTP server
// Bundled by Electrobun and served alongside index.html

const BASE_URL = 'http://localhost:9470'

export interface HealthResponse {
  status: string
  version: string
  nodeId: string
  uptime: number
  sessions: number
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    throw new Error(`Warren API error: ${res.status} ${res.statusText}`)
  }

  return res.json() as Promise<T>
}

export interface PairStartResponse {
  pin: string
  expiresAt: number
  pairUrl: string
  qrSvg: string
}

export interface SessionInfo {
  id: string
  deviceId: string
  shell: string
  startedAt: number
  cols: number
  rows: number
}

export interface DeviceInfo {
  id: string
  name: string
  pairedAt: number
  lastSeen: number
  permission: 'full' | 'revoked'
}

const api = {
  health(): Promise<HealthResponse> {
    return request<HealthResponse>('/health')
  },

  startPairing(): Promise<PairStartResponse> {
    return request<PairStartResponse>('/api/pair/start')
  },

  sessions(): Promise<SessionInfo[]> {
    return request<SessionInfo[]>('/api/sessions')
  },

  devices(): Promise<DeviceInfo[]> {
    return request<DeviceInfo[]>('/api/devices')
  },

  revokeDevice(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/devices/${id}/revoke`, { method: 'PATCH' })
  },

  deleteDevice(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/devices/${id}`, { method: 'DELETE' })
  },

  killSession(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/sessions/${id}`, { method: 'DELETE' })
  },
}

// Make available as a global for the inline script in index.html
// @ts-expect-error — intentional global
window.api = api
