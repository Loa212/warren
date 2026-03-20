// HTTP client for Warren REST API endpoints

import type {
  ConfigResponse,
  DeviceInfo,
  DiscoverNode,
  HealthResponse,
  PairStartResponse,
  WarrenConfig,
} from './types'

/**
 * HTTP client for the Warren REST API.
 *
 * Wraps all REST endpoints exposed by the Warren server. Used internally by
 * the `Warren` class but also available standalone for lightweight usage.
 */
export class WarrenHttp {
  private readonly baseUrl: string

  constructor(host: string, port: number) {
    this.baseUrl = `http://${host}:${port}`
  }

  /** GET /health — server health check. */
  async getHealth(): Promise<HealthResponse> {
    return this.get('/health')
  }

  /** GET /api/devices — list paired devices. */
  async listDevices(): Promise<DeviceInfo[]> {
    return this.get('/api/devices')
  }

  /** DELETE /api/devices/:id — remove a paired device. */
  async removeDevice(deviceId: string): Promise<void> {
    await this.fetch(`/api/devices/${deviceId}`, { method: 'DELETE' })
  }

  /** PATCH /api/devices/:id/revoke — revoke device access. */
  async revokeDevice(deviceId: string): Promise<void> {
    await this.fetch(`/api/devices/${deviceId}/revoke`, { method: 'PATCH' })
  }

  /** GET /api/sessions — list active terminal sessions. */
  async listSessions(): Promise<import('@warren/types').TerminalSession[]> {
    return this.get('/api/sessions')
  }

  /** DELETE /api/sessions/:id — kill a terminal session. */
  async killSession(sessionId: string): Promise<void> {
    await this.fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' })
  }

  /** GET /api/pair/start — initiate device pairing (returns QR + PIN). */
  async startPairing(): Promise<PairStartResponse> {
    return this.get('/api/pair/start')
  }

  /** GET /api/discover — discover Warren nodes on the LAN. */
  async discover(): Promise<DiscoverNode[]> {
    return this.get('/api/discover')
  }

  /** GET /api/config — read server configuration. */
  async getConfig(): Promise<ConfigResponse> {
    return this.get('/api/config')
  }

  /** PATCH /api/config — update server configuration. */
  async updateConfig(partial: Partial<Omit<WarrenConfig, 'nodeId'>>): Promise<void> {
    await this.fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    })
  }

  // -------------------------------------------------------------------------
  // Internal helpers
  // -------------------------------------------------------------------------

  private async get<T>(path: string): Promise<T> {
    const res = await this.fetch(path)
    return res.json() as Promise<T>
  }

  private async fetch(path: string, init?: RequestInit): Promise<Response> {
    const res = await globalThis.fetch(`${this.baseUrl}${path}`, init)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Warren HTTP ${res.status}: ${path} — ${body}`)
    }
    return res
  }
}
