// Typed WebSocket client using WsMessage protocol
//
// v0.2: Encrypted transport via AES-256-GCM using @noble/ciphers (pure JS).
// Uses @noble/hashes for HMAC. Neither requires a secure context (HTTPS),
// so the PWA works over plain HTTP on a local network.

import { gcm } from '@noble/ciphers/aes.js'
import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import type { EncryptedPayload, WsMessage } from '@warren/types'

type MessageHandler = (msg: WsMessage) => void
type ConnectionHandler = () => void

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

interface SharedSecretRef {
  key: Uint8Array
}

// HMAC-SHA256 using @noble/hashes — synchronous, no crypto.subtle required
export function hmacSign(nonce: string, secret: SharedSecretRef): string {
  const data = new TextEncoder().encode(nonce)
  const sig = hmac(sha256, secret.key, data)
  return toBase64(sig)
}

// AES-256-GCM using @noble/ciphers — synchronous, no crypto.subtle required
function encryptPayload(data: string, secret: SharedSecretRef): EncryptedPayload {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(data)
  const encrypted = gcm(secret.key, iv).encrypt(encoded)
  return { ciphertext: toBase64(encrypted), iv: toBase64(iv), algorithm: 'AES-GCM' }
}

function decryptPayload(encrypted: EncryptedPayload, secret: SharedSecretRef): string {
  const iv = fromBase64(encrypted.iv)
  const ciphertext = fromBase64(encrypted.ciphertext)
  const decrypted = gcm(secret.key, iv).decrypt(ciphertext)
  return new TextDecoder().decode(decrypted)
}

// ---------------------------------------------------------------------------
// WebSocket client
// ---------------------------------------------------------------------------

export class WarrenWsClient {
  private ws: WebSocket | null = null
  private readonly url: string
  private messageHandlers: Set<MessageHandler> = new Set()
  private openHandlers: Set<ConnectionHandler> = new Set()
  private closeHandlers: Set<ConnectionHandler> = new Set()
  private reconnectTimer: number | null = null
  private shouldReconnect = true
  private sharedSecret: SharedSecretRef | null = null

  constructor(url: string) {
    this.url = url
  }

  setSharedSecret(key: Uint8Array): void {
    this.sharedSecret = { key }
  }

  connect(): void {
    this.shouldReconnect = true
    this.createSocket()
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }

  send(msg: WsMessage): void {
    if (this.ws?.readyState !== WebSocket.OPEN) return

    if (this.sharedSecret) {
      const payload = encryptPayload(JSON.stringify(msg), this.sharedSecret)
      this.ws.send(JSON.stringify({ type: 'encrypted:message', payload }))
    } else {
      this.ws.send(JSON.stringify(msg))
    }
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler)
    return () => this.messageHandlers.delete(handler)
  }

  onOpen(handler: ConnectionHandler): () => void {
    this.openHandlers.add(handler)
    return () => this.openHandlers.delete(handler)
  }

  onClose(handler: ConnectionHandler): () => void {
    this.closeHandlers.add(handler)
    return () => this.closeHandlers.delete(handler)
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  private createSocket(): void {
    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        for (const handler of this.openHandlers) handler()
      }

      this.ws.onmessage = (event: MessageEvent<string>) => {
        try {
          let msg = JSON.parse(event.data) as WsMessage
          if (msg.type === 'encrypted:message' && this.sharedSecret) {
            const inner = decryptPayload(
              (msg as { type: string; payload: EncryptedPayload }).payload,
              this.sharedSecret,
            )
            msg = JSON.parse(inner) as WsMessage
          }
          for (const handler of this.messageHandlers) handler(msg)
        } catch {
          console.error('[warren] Failed to parse WS message:', event.data)
        }
      }

      this.ws.onclose = () => {
        for (const handler of this.closeHandlers) handler()
        if (this.shouldReconnect) {
          this.reconnectTimer = window.setTimeout(() => this.createSocket(), 3000)
        }
      }

      this.ws.onerror = () => {
        // onclose fires after onerror, so reconnect is handled there
      }
    } catch (err) {
      console.error('[warren] WebSocket creation failed:', err)
    }
  }
}
