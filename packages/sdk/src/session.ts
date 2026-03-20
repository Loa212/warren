// Terminal session handle — wraps a remote PTY session over WebSocket

import type { TerminalSession } from '@warren/types'
import { Emitter } from './emitter'
import type { SessionEvents } from './types'
import type { WarrenWs } from './ws'

/**
 * A handle to a remote terminal session.
 *
 * Created via `warren.createSession()`. Provides methods to write data,
 * listen for output, resize the terminal, and kill the session.
 *
 * @example
 * ```ts
 * const session = await warren.createSession({ shell: '/bin/zsh' })
 * session.onData((data) => process.stdout.write(data))
 * session.write('ls -la\n')
 * session.resize(120, 40)
 * await session.kill()
 * ```
 */
export class Session extends Emitter<SessionEvents> {
  /** The underlying session metadata from the server. */
  readonly info: TerminalSession

  private readonly ws: WarrenWs
  private readonly unsub: () => void
  private ended = false

  constructor(info: TerminalSession, ws: WarrenWs) {
    super()
    this.info = info
    this.ws = ws

    // Subscribe to WS messages for this session
    this.unsub = ws.on('message', (msg) => {
      if (msg.type === 'terminal:data' && msg.sessionId === this.info.id) {
        this.emit('data', msg.data)
      }
      if (msg.type === 'session:ended' && msg.sessionId === this.info.id) {
        this.ended = true
        this.emit('ended')
        this.unsub()
      }
    })
  }

  /** The session ID. */
  get id(): string {
    return this.info.id
  }

  /** Whether this session has ended. */
  get isEnded(): boolean {
    return this.ended
  }

  /** Write data to the session's stdin. */
  write(data: string): void {
    if (this.ended) return
    this.ws.send({ type: 'terminal:data', sessionId: this.info.id, data })
  }

  /**
   * Subscribe to terminal output data.
   *
   * @returns Unsubscribe function.
   */
  onData(handler: (data: string) => void): () => void {
    return this.on('data', handler)
  }

  /**
   * Subscribe to session end event.
   *
   * @returns Unsubscribe function.
   */
  onEnd(handler: () => void): () => void {
    return this.on('ended', handler)
  }

  /** Resize the terminal. */
  resize(cols: number, rows: number): void {
    if (this.ended) return
    this.ws.send({ type: 'terminal:resize', sessionId: this.info.id, cols, rows })
  }

  /**
   * Kill the session.
   *
   * Resolves when the server confirms the session has ended.
   * If the session is already ended, resolves immediately.
   */
  kill(): Promise<void> {
    if (this.ended) return Promise.resolve()

    return new Promise<void>((resolve) => {
      this.once('ended', () => resolve())
      this.ws.send({ type: 'session:kill', sessionId: this.info.id })
    })
  }

  /** Clean up internal subscriptions. */
  dispose(): void {
    this.unsub()
    this.removeAllListeners()
  }
}
