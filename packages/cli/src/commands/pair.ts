// warren pair [--pin-only] — show QR code and PIN for device pairing
//
// Requires the Warren server to be running (warren host start).
// Renders a QR code in the terminal for the controller to scan.

import { loadConfig } from '@warren/core'
import { defineCommand } from 'citty'
import QRCode from 'qrcode'
import * as ui from '../ui'

export const pairCommand = defineCommand({
  meta: { name: 'pair', description: 'Show QR code and PIN for device pairing' },
  args: {
    'pin-only': {
      type: 'boolean',
      description: 'Show PIN only (no QR code)',
    },
    port: {
      type: 'string',
      description: 'Server port to query',
    },
  },
  async run({ args }) {
    const config = loadConfig()
    const port = args.port ? Number.parseInt(String(args.port), 10) : config.port

    try {
      const res = await fetch(`http://localhost:${port}/api/pair/start`)
      const data = (await res.json()) as {
        pin: string
        expiresAt: number
        pairUrl: string
      }

      ui.banner()
      console.log()

      if (!args['pin-only']) {
        const qrText = await QRCode.toString(data.pairUrl, {
          type: 'terminal',
          small: true,
        })
        console.log(qrText)
      }

      console.log(`  PIN: ${ui.c.bold(ui.c.purple(data.pin))}`)
      console.log(`  Expires: ${new Date(data.expiresAt).toLocaleTimeString()}`)
      console.log()
      ui.info('Waiting for device to scan QR or enter PIN...')
      ui.info(ui.c.dim('Press Ctrl+C to cancel'))

      // Keep alive until expiry or Ctrl+C
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, data.expiresAt - Date.now())
        process.on('SIGINT', () => {
          clearTimeout(timeout)
          console.log()
          resolve()
        })
      })
    } catch {
      ui.error('Could not reach Warren server')
      ui.info(ui.c.dim('Start the host first: warren host start'))
    }
  },
})
