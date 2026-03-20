// warren tunnel status|setup — manage tunnel configuration
//
// Warren doesn't provide a relay server. For remote access, users
// configure their own tunnel (Cloudflare, Tailscale, ngrok).

import { defineCommand } from 'citty'
import * as ui from '../ui'

const PROVIDERS = [
  { name: 'Cloudflare Tunnel', cmd: 'cloudflared', free: true },
  { name: 'Tailscale', cmd: 'tailscale', free: true },
  { name: 'ngrok', cmd: 'ngrok', free: false },
]

export const tunnelCommand = defineCommand({
  meta: { name: 'tunnel', description: 'Manage tunnel configuration' },
  subCommands: {
    status: defineCommand({
      meta: { name: 'status', description: 'Show tunnel status' },
      run() {
        ui.info('No tunnels configured')
        ui.info(ui.c.dim('Set up a tunnel with: warren tunnel setup'))
      },
    }),

    setup: defineCommand({
      meta: { name: 'setup', description: 'Set up a tunnel provider' },
      run() {
        ui.banner()
        console.log()
        ui.info('Supported tunnel providers:')
        console.log()

        for (const p of PROVIDERS) {
          const tier = p.free ? ui.c.green('free tier') : ui.c.yellow('limited free')
          console.log(`  ${ui.c.bold(p.name)} (${tier})`)
          console.log(`  ${ui.c.dim(`Install: brew install ${p.cmd}`)}`)
          console.log()
        }

        ui.info('After installing a provider, forward traffic to your Warren port:')
        console.log()
        console.log(`  ${ui.c.dim('cloudflared tunnel --url http://localhost:9470')}`)
        console.log(`  ${ui.c.dim('tailscale funnel 9470')}`)
        console.log(`  ${ui.c.dim('ngrok tcp 9470')}`)
      },
    }),
  },
})
