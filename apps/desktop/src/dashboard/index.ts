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

export const api = {
  health(): Promise<HealthResponse> {
    return request<HealthResponse>('/health')
  },

  // TODO: Add more endpoints as the server exposes them:
  //   sessions(): Promise<TerminalSession[]>
  //   devices(): Promise<PairedDevice[]>
  //   revokeDevice(id: string): Promise<void>
  //   killSession(id: string): Promise<void>
}

// Make available as a global for the inline script in index.html
// @ts-expect-error — intentional global
window.api = api
