// @warren/sdk — SDK-specific types and interfaces

import type { EncryptedPayload, PairedDevice, TerminalSession, WarrenConfig } from '@warren/types'

// ---------------------------------------------------------------------------
// Connection options
// ---------------------------------------------------------------------------

/** Options for connecting to a Warren host. */
export interface WarrenOptions {
  /** Host address (IP or hostname). */
  host: string
  /** Port number (default: 9470). */
  port?: number
  /** v0.1 auth token. Mutually exclusive with keypair auth. */
  token?: string
  /** v0.2 keypair auth credentials. Mutually exclusive with token. */
  keypair?: {
    deviceId: string
    /** Base64-encoded shared secret (from prior pairing). */
    sharedSecret: string
  }
  /** Auto-reconnect on disconnect (default: true). */
  autoReconnect?: boolean
  /** Max reconnect attempts before giving up (default: Infinity). */
  maxReconnectAttempts?: number
  /** Base delay in ms for reconnect backoff (default: 1000). */
  reconnectBaseDelay?: number
}

/** Options for creating a new terminal session. */
export interface CreateSessionOptions {
  /** Shell to launch (e.g. "/bin/zsh"). Server default if omitted. */
  shell?: string
}

// ---------------------------------------------------------------------------
// Event maps
// ---------------------------------------------------------------------------

/** Events emitted by the Warren client. */
export type WarrenEvents = {
  connected: []
  disconnected: []
  error: [error: Error]
  'session:created': [session: TerminalSession]
  'session:ended': [sessionId: string]
}

/** Events emitted by a terminal session. */
export type SessionEvents = {
  data: [data: string]
  ended: []
}

// ---------------------------------------------------------------------------
// HTTP response types
// ---------------------------------------------------------------------------

/** Response from GET /health. */
export interface HealthResponse {
  status: string
  version: string
  nodeId: string
  uptime: number
  sessions: number
}

/** Device info returned by GET /api/devices (public subset of PairedDevice). */
export interface DeviceInfo {
  id: string
  name: string
  pairedAt: number
  lastSeen: number
  permission: PairedDevice['permission']
}

/** Response from GET /api/pair/start. */
export interface PairStartResponse {
  pin: string
  expiresAt: number
  pairUrl: string
  qrSvg: string
}

/** Response from GET /api/discover. */
export interface DiscoverNode {
  version: string
  nodeId: string
  hostName: string
  hostMode: boolean
  port: number
}

/** Public config fields returned by GET /api/config. */
export interface ConfigResponse {
  shell: string
  port: number
  hostMode: boolean
  theme: string
  logging: boolean
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

/** Shared secret reference for encryption. */
export interface SharedSecretRef {
  key: Uint8Array
}

export type { EncryptedPayload, PairedDevice, TerminalSession, WarrenConfig }
