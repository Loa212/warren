// warren connect <host> — open interactive terminal session to a Warren host
//
// Connects via WebSocket, authenticates with a token (v0.1), and pipes
// stdin/stdout in raw mode for a full terminal experience.
// Press Ctrl+] to disconnect.

import { loadConfig } from '@warren/core'
import type { WsMessage } from '@warren/types'
import { defineCommand } from 'citty'
import * as ui from '../ui'

export const connectCommand = defineCommand({
  meta: { name: 'connect', description: 'Connect to a Warren host' },
  args: {
    host: {
      type: 'positional',
      description: 'Host address (ip:port or ip)',
      required: true,
    },
    token: {
      type: 'string',
      description: 'Auth token (v0.1 compatibility)',
    },
  },
  async run({ args }) {
    const hostAddr = args.host.includes(':') ? args.host : `${args.host}:9470`
    const token = args.token ?? ''
    const config = loadConfig()

    ui.info(`Connecting to ${hostAddr}...`)

    const params = new URLSearchParams()
    if (token) params.set('token', token)
    const qs = params.toString()
    const wsUrl = `ws://${hostAddr}/ws${qs ? `?${qs}` : ''}`

    return new Promise<void>((resolve) => {
      const ws = new WebSocket(wsUrl)
      let sessionId: string | null = null
      let cleanedUp = false

      function send(msg: WsMessage): void {
        ws.send(JSON.stringify(msg))
      }

      function cleanup(): void {
        if (cleanedUp) return
        cleanedUp = true

        try {
          if (process.stdin.isTTY) process.stdin.setRawMode(false)
        } catch {
          // Already cleaned up
        }
        process.stdin.pause()
        ws.close()
        console.log()
        ui.info('Disconnected')
        resolve()
      }

      // Handle Ctrl+C before raw mode is active
      process.on('SIGINT', cleanup)

      ws.addEventListener('open', () => {
        ui.info('Connected, authenticating...')
      })

      ws.addEventListener('message', (event) => {
        if (cleanedUp) return

        const msg = JSON.parse(String(event.data)) as WsMessage

        switch (msg.type) {
          case 'auth:challenge': {
            send({
              type: 'auth:response',
              signature: token,
              deviceId: `cli-${config.nodeId.slice(0, 8)}`,
            })
            break
          }

          case 'auth:success': {
            ui.success('Authenticated')
            send({ type: 'session:create' })
            break
          }

          case 'auth:failure': {
            ui.error(`Authentication failed: ${msg.reason}`)
            ws.close()
            break
          }

          case 'session:created': {
            sessionId = msg.session.id
            ui.success(`Session started (${msg.session.shell})`)
            ui.info(ui.c.dim('Press Ctrl+] to disconnect'))
            console.log()

            // Enter raw terminal mode
            if (process.stdin.isTTY) {
              process.stdin.setRawMode(true)
            }
            process.stdin.resume()
            process.stdin.on('data', (data: Buffer) => {
              if (cleanedUp) return
              // Ctrl+] (0x1d) to disconnect
              if (data[0] === 0x1d) {
                cleanup()
                return
              }
              if (sessionId) {
                send({ type: 'terminal:data', sessionId, data: data.toString() })
              }
            })

            // Handle terminal resize
            const onResize = () => {
              if (sessionId && !cleanedUp) {
                send({
                  type: 'terminal:resize',
                  sessionId,
                  cols: process.stdout.columns ?? 80,
                  rows: process.stdout.rows ?? 24,
                })
              }
            }
            process.stdout.on('resize', onResize)
            onResize()
            break
          }

          case 'terminal:data': {
            process.stdout.write(msg.data)
            break
          }

          case 'session:ended': {
            ui.info('Session ended by host')
            cleanup()
            break
          }
        }
      })

      ws.addEventListener('close', () => {
        if (!cleanedUp) cleanup()
      })

      ws.addEventListener('error', () => {
        if (!cleanedUp) {
          ui.error(`Failed to connect to ${hostAddr}`)
          cleanedUp = true
          resolve()
        }
      })
    })
  },
})
