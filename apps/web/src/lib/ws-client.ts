// Typed WebSocket client using WsMessage protocol

import type { WsMessage } from '@warren/types'

type MessageHandler = (msg: WsMessage) => void
type ConnectionHandler = () => void

export class WarrenWsClient {
  private ws: WebSocket | null = null
  private readonly url: string
  private messageHandlers: Set<MessageHandler> = new Set()
  private openHandlers: Set<ConnectionHandler> = new Set()
  private closeHandlers: Set<ConnectionHandler> = new Set()
  private reconnectTimer: number | null = null
  private shouldReconnect = true

  constructor(url: string) {
    this.url = url
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
    if (this.ws?.readyState === WebSocket.OPEN) {
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
          const msg = JSON.parse(event.data) as WsMessage
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
