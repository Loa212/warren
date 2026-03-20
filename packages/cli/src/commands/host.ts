// warren host start|stop|status — manage host mode

import { hostname } from 'node:os'
import { loadConfig, startServer, updateConfig } from '@warren/core'
import { defineCommand } from 'citty'
import * as ui from '../ui'

export const hostCommand = defineCommand({
  meta: { name: 'host', description: 'Manage host mode' },
  subCommands: {
    start: defineCommand({
      meta: { name: 'start', description: 'Start host mode (foreground)' },
      args: {
        port: { type: 'string', description: 'Port to listen on' },
      },
      run({ args }) {
        const config = loadConfig()
        const port = args.port ? Number.parseInt(String(args.port), 10) : config.port

        updateConfig({ hostMode: true })

        ui.banner()
        console.log()

        const server = startServer({ port, config: { ...config, hostMode: true } })

        console.log()
        ui.info(`Node:   ${ui.c.dim(config.nodeId.slice(0, 8))}`)
        ui.info(`Host:   ${hostname()}`)
        console.log()
        ui.info(ui.c.dim('Press Ctrl+C to stop'))

        process.on('SIGINT', () => {
          console.log()
          ui.info('Shutting down...')
          server.stop()
          process.exit(0)
        })
      },
    }),

    stop: defineCommand({
      meta: { name: 'stop', description: 'Disable host mode in config' },
      run() {
        updateConfig({ hostMode: false })
        ui.success('Host mode disabled')
      },
    }),

    status: defineCommand({
      meta: { name: 'status', description: 'Show host status' },
      async run() {
        const config = loadConfig()

        ui.banner()
        console.log()

        const status = config.hostMode ? ui.c.green('active') : ui.c.dim('inactive')
        console.log(`  Host mode: ${status}`)
        console.log(`  Port:      ${config.port}`)
        console.log(`  Shell:     ${config.shell}`)
        console.log(`  Node ID:   ${ui.c.dim(`${config.nodeId.slice(0, 8)}...`)}`)

        if (config.hostMode) {
          try {
            const res = await fetch(`http://localhost:${config.port}/health`)
            const health = (await res.json()) as { sessions: number; uptime: number }
            console.log(`  Sessions:  ${health.sessions}`)
            console.log(`  Uptime:    ${health.uptime}s`)
          } catch {
            console.log()
            ui.warn('Host is configured but server is not running')
            ui.info(ui.c.dim('Start with: warren host start'))
          }
        }
      },
    }),
  },
})
