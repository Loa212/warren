// warren config / warren config set <key> <value> — manage configuration

import { loadConfig, updateConfig } from '@warren/core'
import type { WarrenConfig } from '@warren/types'
import { defineCommand } from 'citty'
import * as ui from '../ui'

const SETTABLE_KEYS = ['hostMode', 'shell', 'port', 'theme', 'logging'] as const
type SettableKey = (typeof SETTABLE_KEYS)[number]

export function formatConfigValue(key: string, value: unknown): string {
  if (key === 'nodeId') return ui.c.dim(String(value))
  if (typeof value === 'boolean') return value ? ui.c.green('true') : ui.c.dim('false')
  return String(value)
}

function parseConfigValue(key: SettableKey, value: string): boolean | number | string {
  switch (key) {
    case 'hostMode':
    case 'logging':
      return value === 'true'
    case 'port':
      return Number.parseInt(value, 10)
    default:
      return value
  }
}

export const configCommand = defineCommand({
  meta: { name: 'config', description: 'Manage Warren configuration' },
  subCommands: {
    set: defineCommand({
      meta: { name: 'set', description: 'Set a config value' },
      args: {
        key: {
          type: 'positional',
          description: `Config key (${SETTABLE_KEYS.join(', ')})`,
          required: true,
        },
        value: {
          type: 'positional',
          description: 'New value',
          required: true,
        },
      },
      run({ args }) {
        const key = String(args.key)
        const value = String(args.value)

        if (!SETTABLE_KEYS.includes(key as SettableKey)) {
          ui.error(`Invalid config key: ${key}`)
          ui.info(ui.c.dim(`Settable keys: ${SETTABLE_KEYS.join(', ')}`))
          process.exit(1)
        }

        const parsed = parseConfigValue(key as SettableKey, value)
        updateConfig({ [key]: parsed } as Partial<WarrenConfig>)
        ui.success(`${key} = ${parsed}`)
      },
    }),
  },

  // Default: show all config
  run() {
    const config = loadConfig()

    for (const [key, value] of Object.entries(config)) {
      console.log(`  ${ui.c.bold(key.padEnd(10))} ${formatConfigValue(key, value)}`)
    }
  },
})
