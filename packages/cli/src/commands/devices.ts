// warren devices / warren devices revoke <id> — manage paired devices

import type { StoredDevice } from '@warren/core'
import { listPairedDevices, removePairedDevice, revokeDevice } from '@warren/core'
import { defineCommand } from 'citty'
import * as ui from '../ui'

export function formatDeviceRow(device: StoredDevice): string[] {
  const status = device.permission === 'full' ? ui.c.green('active') : ui.c.red('revoked')
  return [
    device.id.slice(0, 8),
    device.name,
    status,
    new Date(device.pairedAt).toLocaleDateString(),
    new Date(device.lastSeen).toLocaleString(),
  ]
}

export const devicesCommand = defineCommand({
  meta: { name: 'devices', description: 'Manage paired devices' },
  subCommands: {
    revoke: defineCommand({
      meta: { name: 'revoke', description: 'Revoke access for a paired device' },
      args: {
        id: {
          type: 'positional',
          description: 'Device ID (or prefix)',
          required: true,
        },
      },
      run({ args }) {
        const id = String(args.id)
        const devices = listPairedDevices()
        const match = devices.find((d) => d.id === id || d.id.startsWith(id))

        if (!match) {
          ui.error(`Device not found: ${id}`)
          process.exit(1)
        }

        revokeDevice(match.id)
        ui.success(`Revoked device: ${match.name} (${match.id.slice(0, 8)})`)
      },
    }),

    remove: defineCommand({
      meta: { name: 'remove', description: 'Remove a paired device entirely' },
      args: {
        id: {
          type: 'positional',
          description: 'Device ID (or prefix)',
          required: true,
        },
      },
      run({ args }) {
        const id = String(args.id)
        const devices = listPairedDevices()
        const match = devices.find((d) => d.id === id || d.id.startsWith(id))

        if (!match) {
          ui.error(`Device not found: ${id}`)
          process.exit(1)
        }

        removePairedDevice(match.id)
        ui.success(`Removed device: ${match.name} (${match.id.slice(0, 8)})`)
      },
    }),
  },

  // Default: list all devices
  run() {
    const devices = listPairedDevices()

    if (devices.length === 0) {
      ui.info('No paired devices')
      ui.info(ui.c.dim('Pair a device with: warren pair'))
      return
    }

    ui.table(['ID', 'Name', 'Status', 'Paired', 'Last seen'], devices.map(formatDeviceRow))
  },
})
