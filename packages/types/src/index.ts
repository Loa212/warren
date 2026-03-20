// @warren/types — shared TypeScript types for the Warren mesh

// ---------------------------------------------------------------------------
// Node identity
// ---------------------------------------------------------------------------

export interface WarrenNode {
  id: string // unique node ID (uuid)
  name: string // human-readable (machine hostname)
  platform: 'macos' | 'windows' | 'linux' | 'web'
  version: string
  capabilities: ('host' | 'controller')[]
}

// ---------------------------------------------------------------------------
// Pairing
// ---------------------------------------------------------------------------

export interface PairedDevice {
  id: string
  name: string
  publicKey: string // X25519 public key (base64)
  pairedAt: number // unix timestamp
  lastSeen: number
  permission: 'full' | 'revoked'
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export interface TerminalSession {
  id: string
  deviceId: string // which paired device opened this session
  shell: string // e.g. "/bin/zsh"
  startedAt: number
  cols: number
  rows: number
}

// ---------------------------------------------------------------------------
// Crypto types (shared across packages)
// ---------------------------------------------------------------------------

export interface EncryptedPayload {
  ciphertext: string // base64
  iv: string // base64
  algorithm: 'AES-GCM'
}

export interface QrPayload {
  host: string // IP:port
  nonce: string // one-time pairing nonce
  publicKey: string // host's X25519 public key (base64)
  version: string // protocol version
}

// ---------------------------------------------------------------------------
// WebSocket protocol messages
// ---------------------------------------------------------------------------

export type WsMessage =
  // Terminal I/O
  | { type: 'terminal:data'; sessionId: string; data: string }
  | { type: 'terminal:resize'; sessionId: string; cols: number; rows: number }
  // Session lifecycle
  | { type: 'session:create'; shell?: string }
  | { type: 'session:created'; session: TerminalSession }
  | { type: 'session:kill'; sessionId: string }
  | { type: 'session:ended'; sessionId: string }
  // Auth (v0.1 token + v0.2 HMAC challenge-response)
  | { type: 'auth:challenge'; nonce: string }
  | { type: 'auth:response'; signature: string; deviceId: string }
  | { type: 'auth:success' }
  | { type: 'auth:failure'; reason: string }
  // Pairing (v0.2 X25519 ECDH key exchange)
  | { type: 'pair:request'; publicKey: string; nonceSig: string }
  | { type: 'pair:accept'; publicKey: string; deviceId: string }
  | { type: 'pair:reject'; reason: string }
  // Encrypted envelope (wraps any WsMessage after auth)
  | { type: 'encrypted:message'; payload: EncryptedPayload }
  // Heartbeat
  | { type: 'ping' }
  | { type: 'pong' }

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export interface WarrenTheme {
  name: string
  author: string
  version: string
  colors: {
    background: string
    foreground: string
    cursor: string
    cursorAccent: string
    selection: string
    black: string
    red: string
    green: string
    yellow: string
    blue: string
    magenta: string
    cyan: string
    white: string
    brightBlack: string
    brightRed: string
    brightGreen: string
    brightYellow: string
    brightBlue: string
    brightMagenta: string
    brightCyan: string
    brightWhite: string
  }
  ui?: {
    accent?: string
    border?: string
    tabBar?: string
    activeTab?: string
  }
  font?: {
    family?: string
    size?: number
    lineHeight?: number
  }
}

// ---------------------------------------------------------------------------
// Discovery (Bonjour TXT records)
// ---------------------------------------------------------------------------

export interface WarrenServiceInfo {
  version: string
  nodeId: string
  hostName: string
  hostMode: boolean
  port: number
}

// ---------------------------------------------------------------------------
// Tunnels
// ---------------------------------------------------------------------------

export type TunnelProvider = 'cloudflare' | 'tailscale'

export interface TunnelProviderStatus {
  provider: TunnelProvider
  installed: boolean
  running: boolean
  url: string | null
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface WarrenConfig {
  nodeId: string
  hostMode: boolean
  shell: string
  port: number
  theme: string
  logging: boolean
  pin?: string // optional PWA lock PIN (hashed)
}
