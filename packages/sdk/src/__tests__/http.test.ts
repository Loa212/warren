import { describe, expect, mock, test } from 'bun:test'
import { WarrenHttp } from '../http'
import type { DeviceInfo } from '../types'

// biome-ignore lint/suspicious/noExplicitAny: mock fetch requires flexible typing
function mockFetch(response: () => Promise<Response>): any {
  return Object.assign(mock(response), { preconnect: mock() })
}

describe('WarrenHttp', () => {
  test('constructs correct base URL', () => {
    const http = new WarrenHttp('192.168.1.10', 9470)
    expect(http).toBeDefined()
  })

  test('getHealth calls /health endpoint', async () => {
    const mockResponse = {
      status: 'ok',
      version: '0.2.0',
      nodeId: 'test-id',
      uptime: 100,
      sessions: 0,
    }

    const originalFetch = globalThis.fetch
    globalThis.fetch = mockFetch(async () => new Response(JSON.stringify(mockResponse)))

    try {
      const http = new WarrenHttp('localhost', 9470)
      const health = await http.getHealth()

      expect(health).toEqual(mockResponse)
      expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:9470/health', undefined)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('listDevices calls /api/devices endpoint', async () => {
    const mockDevices: DeviceInfo[] = [
      { id: 'd1', name: 'device-1', pairedAt: 1000, lastSeen: 2000, permission: 'full' },
    ]

    const originalFetch = globalThis.fetch
    globalThis.fetch = mockFetch(async () => new Response(JSON.stringify(mockDevices)))

    try {
      const http = new WarrenHttp('localhost', 9470)
      const devices = await http.listDevices()

      expect(devices).toEqual(mockDevices)
      expect(globalThis.fetch).toHaveBeenCalledWith('http://localhost:9470/api/devices', undefined)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('throws on non-ok response', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mockFetch(async () => new Response('Not found', { status: 404 }))

    try {
      const http = new WarrenHttp('localhost', 9470)
      await expect(http.getHealth()).rejects.toThrow('Warren HTTP 404')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('updateConfig sends PATCH request', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = mockFetch(async () => new Response(JSON.stringify({ ok: true })))

    try {
      const http = new WarrenHttp('localhost', 9470)
      await http.updateConfig({ theme: 'dark' })

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:9470/api/config',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ theme: 'dark' }),
        }),
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
