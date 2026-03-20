// WebSocket client for the Warren WsMessage protocol
//
// Supports:
//   - v0.1 token auth
//   - v0.2 keypair auth (HMAC challenge-response)
//   - AES-256-GCM encrypted transport
//   - Auto-reconnect with exponential backoff

import type { EncryptedPayload, WsMessage } from '@warren/types'
import { decryptPayload, encryptPayload, fromBase64, hmacSign } from './crypto'
import { Emitter } from './emitter'
import type { SharedSecretRef, WarrenOptions } from './types'

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

type WsEvents = {
  open: []
  close: []
  authenticated: []
  message: [msg: WsMessage]
  error: [error: Error]
}

// ---------------------------------------------------------------------------
// WebSocket client
// ---------------------------------------------------------------------------

/**
 * Low-level WebSocket client with Warren auth and encryption.
 *
 * Used internally by the `Warren` class. Handles the auth handshake
 * automatically on connect and transparently encrypts/decrypts messages
 * when a shared secret is present.
 */
export class WarrenWs extends Emitter<WsEvents> {
  private ws: WebSocket | null = null
  private sharedSecret: SharedSecretRef | null = null
  private shouldReconnect = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private readonly opts: Required<
    Pick<
      WarrenOptions,
      'host' | 'port' | 'autoReconnect' | 'maxReconnectAttempts' | 'reconnectBaseDelay'
    >
  > &
    Pick<WarrenOptions, 'token' | 'keypair'>

  constructor(options: WarrenOptions) {
    super()
    this.opts = {
      host: options.host,
      port: options.port ?? 9470,
      token: options.token,
      keypair: options.keypair,
      autoReconnect: options.autoReconnect ?? true,
      maxReconnectAttempts: options.maxReconnectAttempts ?? Number.POSITIVE_INFINITY,
      reconnectBaseDelay: options.reconnectBaseDelay ?? 1000,
    }

    if (options.keypair) {
      this.sharedSecret = { key: fromBase64(options.keypair.sharedSecret) }
    }
  }

  /** Whether the WebSocket is currently open. */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Open the WebSocket connection and perform auth.
   *
   * Resolves once authenticated. Rejects on auth failure or connection error.
   */
  connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.shouldReconnect = this.opts.autoReconnect
      this.reconnectAttempt = 0
      this.createSocket(resolve, reject)
    })
  }

  /** Close the connection and stop auto-reconnect. */
  disconnect(): void {
    this.shouldReconnect = false
    this.clearReconnectTimer()
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
    this.emit('close')
  }

  /** Send a typed WsMessage, encrypting if a shared secret is set. */
  send(msg: WsMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return

    if (this.sharedSecret) {
      const payload = encryptPayload(JSON.stringify(msg), this.sharedSecret)
      this.ws.send(JSON.stringify({ type: 'encrypted:message', payload }))
    } else {
      this.ws.send(JSON.stringify(msg))
    }
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private buildUrl(): string {
    const base = `ws://${this.opts.host}:${this.opts.port}/ws`
    if (this.opts.keypair) {
      return `${base}?deviceId=${encodeURIComponent(this.opts.keypair.deviceId)}`
    }
    if (this.opts.token) {
      return `${base}?token=${encodeURIComponent(this.opts.token)}`
    }
    return base
  }

  private createSocket(onAuth?: () => void, onFail?: (reason: Error) => void): void {
    this.clearReconnectTimer()

    try {
      const url = this.buildUrl()
      this.ws = new WebSocket(url)
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      this.emit('error', error)
      onFail?.(error)
      return
    }

    let authenticated = false

    this.ws.onopen = () => {
      this.reconnectAttempt = 0
      this.emit('open')
    }

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const raw = typeof event.data === 'string' ? event.data : String(event.data)
        let msg = JSON.parse(raw) as WsMessage

        // Decrypt envelope if needed
        if (msg.type === 'encrypted:message' && this.sharedSecret) {
          const inner = decryptPayload(
            (msg as { type: string; payload: EncryptedPayload }).payload,
            this.sharedSecret,
          )
          msg = JSON.parse(inner) as WsMessage
        }

        // Handle auth flow
        if (!authenticated) {
          if (msg.type === 'auth:challenge') {
            this.handleChallenge(msg.nonce)
            return
          }
          if (msg.type === 'auth:success') {
            authenticated = true
            this.emit('authenticated')
            onAuth?.()
            // Clear the callbacks so reconnect doesn't resolve old promises
            onAuth = undefined
            onFail = undefined
            return
          }
          if (msg.type === 'auth:failure') {
            const error = new Error(`Auth failed: ${msg.reason}`)
            this.emit('error', error)
            onFail?.(error)
            onAuth = undefined
            onFail = undefined
            return
          }
        }

        // Post-auth messages
        this.emit('message', msg)
      } catch {
        // Ignore malformed messages
      }
    }

    this.ws.onclose = () => {
      this.ws = null
      this.emit('close')

      if (!authenticated) {
        onFail?.(new Error('WebSocket closed before authentication'))
        onAuth = undefined
        onFail = undefined
      }

      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      // onclose fires after onerror, reconnect is handled there
    }
  }

  private handleChallenge(nonce: string): void {
    if (this.opts.keypair && this.sharedSecret) {
      // v0.2 keypair auth: HMAC-sign the nonce
      const signature = hmacSign(nonce, this.sharedSecret)
      this.send({ type: 'auth:response', signature, deviceId: this.opts.keypair.deviceId })
    } else if (this.opts.token) {
      // v0.1 token auth: send token as signature
      this.send({
        type: 'auth:response',
        signature: this.opts.token,
        deviceId: crypto.randomUUID(),
      })
    }
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect) return
    if (this.reconnectAttempt >= this.opts.maxReconnectAttempts) {
      this.emit('error', new Error('Max reconnect attempts reached'))
      return
    }

    const delay = Math.min(this.opts.reconnectBaseDelay * 2 ** this.reconnectAttempt, 30_000)
    this.reconnectAttempt++

    this.reconnectTimer = setTimeout(() => {
      this.createSocket()
    }, delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}
