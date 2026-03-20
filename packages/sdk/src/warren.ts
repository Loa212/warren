// Warren — main SDK entry point
//
// Provides a high-level programmatic API for interacting with a Warren host.
// Wraps the WebSocket protocol and HTTP REST API into a single, ergonomic class.

import type { TerminalSession, WarrenConfig } from '@warren/types'
import { Emitter } from './emitter'
import { WarrenHttp } from './http'
import { Session } from './session'
import type {
  ConfigResponse,
  CreateSessionOptions,
  DeviceInfo,
  DiscoverNode,
  HealthResponse,
  PairStartResponse,
  WarrenEvents,
  WarrenOptions,
} from './types'
import { WarrenWs } from './ws'

/**
 * Programmatic TypeScript client for Warren.
 *
 * Provides both WebSocket-based terminal sessions and HTTP-based management
 * operations through a single unified API.
 *
 * @example
 * ```ts
 * import { Warren } from '@warren/sdk'
 *
 * const warren = new Warren({ host: 'localhost', port: 9470, token: '...' })
 * await warren.connect()
 *
 * const session = await warren.createSession({ shell: '/bin/zsh' })
 * session.onData((data) => process.stdout.write(data))
 * session.write('ls -la\n')
 * session.resize(120, 40)
 * await session.kill()
 *
 * const health = await warren.getHealth()
 * const devices = await warren.listDevices()
 *
 * warren.disconnect()
 * ```
 */
export class Warren extends Emitter<WarrenEvents> {
  private readonly ws: WarrenWs
  private readonly http: WarrenHttp
  private readonly sessions = new Map<string, Session>()

  constructor(options: WarrenOptions) {
    super()
    const port = options.port ?? 9470

    this.ws = new WarrenWs(options)
    this.http = new WarrenHttp(options.host, port)

    // Forward WS events
    this.ws.on('authenticated', () => this.emit('connected'))
    this.ws.on('close', () => this.emit('disconnected'))
    this.ws.on('error', (err) => this.emit('error', err))

    // Track session lifecycle from WS messages
    this.ws.on('message', (msg) => {
      if (msg.type === 'session:created') {
        this.emit('session:created', msg.session)
      }
      if (msg.type === 'session:ended') {
        const session = this.sessions.get(msg.sessionId)
        if (session) {
          this.sessions.delete(msg.sessionId)
        }
        this.emit('session:ended', msg.sessionId)
      }
    })
  }

  /** Whether the WebSocket connection is currently open. */
  get isConnected(): boolean {
    return this.ws.isConnected
  }

  // -------------------------------------------------------------------------
  // Connection
  // -------------------------------------------------------------------------

  /**
   * Connect to the Warren host and authenticate.
   *
   * Resolves once the auth handshake is complete. Rejects on auth failure
   * or connection error.
   */
  async connect(): Promise<void> {
    await this.ws.connect()
  }

  /** Disconnect from the Warren host and clean up all sessions. */
  disconnect(): void {
    for (const session of this.sessions.values()) {
      session.dispose()
    }
    this.sessions.clear()
    this.ws.disconnect()
  }

  // -------------------------------------------------------------------------
  // Terminal sessions (WebSocket)
  // -------------------------------------------------------------------------

  /**
   * Create a new remote terminal session.
   *
   * @param options - Optional session configuration.
   * @returns A `Session` handle for interacting with the terminal.
   */
  createSession(options?: CreateSessionOptions): Promise<Session> {
    return new Promise<Session>((resolve, reject) => {
      const timeout = setTimeout(() => {
        unsub()
        reject(new Error('Timed out waiting for session:created'))
      }, 10_000)

      const unsub = this.ws.on('message', (msg) => {
        if (msg.type === 'session:created') {
          clearTimeout(timeout)
          unsub()
          const session = new Session(msg.session, this.ws)
          this.sessions.set(session.id, session)
          resolve(session)
        }
      })

      this.ws.send({ type: 'session:create', shell: options?.shell })
    })
  }

  /** Get a session by ID (only locally tracked sessions). */
  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId)
  }

  /** Get all locally tracked sessions. */
  getSessions(): Session[] {
    return [...this.sessions.values()]
  }

  // -------------------------------------------------------------------------
  // HTTP API
  // -------------------------------------------------------------------------

  /** GET /health — check server health. */
  async getHealth(): Promise<HealthResponse> {
    return this.http.getHealth()
  }

  /** GET /api/devices — list paired devices. */
  async listDevices(): Promise<DeviceInfo[]> {
    return this.http.listDevices()
  }

  /** DELETE /api/devices/:id — remove a paired device. */
  async removeDevice(deviceId: string): Promise<void> {
    return this.http.removeDevice(deviceId)
  }

  /** PATCH /api/devices/:id/revoke — revoke device access. */
  async revokeDevice(deviceId: string): Promise<void> {
    return this.http.revokeDevice(deviceId)
  }

  /** GET /api/sessions — list active sessions on the server. */
  async listRemoteSessions(): Promise<TerminalSession[]> {
    return this.http.listSessions()
  }

  /** DELETE /api/sessions/:id — kill a session via HTTP. */
  async killRemoteSession(sessionId: string): Promise<void> {
    return this.http.killSession(sessionId)
  }

  /** GET /api/pair/start — initiate device pairing. */
  async startPairing(): Promise<PairStartResponse> {
    return this.http.startPairing()
  }

  /** GET /api/discover — discover Warren nodes on the LAN. */
  async discover(): Promise<DiscoverNode[]> {
    return this.http.discover()
  }

  /** GET /api/config — read server config. */
  async getConfig(): Promise<ConfigResponse> {
    return this.http.getConfig()
  }

  /** PATCH /api/config — update server config. */
  async updateConfig(partial: Partial<Omit<WarrenConfig, 'nodeId'>>): Promise<void> {
    return this.http.updateConfig(partial)
  }
}
