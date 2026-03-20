// warren sessions — list active terminal sessions
//
// Queries the local Warren server's /api/sessions endpoint.

import { loadConfig } from '@warren/core'
import type { TerminalSession } from '@warren/types'
import { defineCommand } from 'citty'
import * as ui from '../ui'

export function formatSessionRow(session: TerminalSession): string[] {
  return [
    session.id.slice(0, 8),
    session.deviceId ? session.deviceId.slice(0, 8) : '—',
    session.shell,
    new Date(session.startedAt).toLocaleTimeString(),
    `${session.cols}x${session.rows}`,
  ]
}

export const sessionsCommand = defineCommand({
  meta: { name: 'sessions', description: 'List active terminal sessions' },
  args: {
    port: { type: 'string', description: 'Server port' },
  },
  async run({ args }) {
    const config = loadConfig()
    const port = args.port ? Number.parseInt(String(args.port), 10) : config.port

    try {
      const res = await fetch(`http://localhost:${port}/api/sessions`)
      const sessions = (await res.json()) as TerminalSession[]

      if (sessions.length === 0) {
        ui.info('No active sessions')
        return
      }

      ui.table(['ID', 'Device', 'Shell', 'Started', 'Size'], sessions.map(formatSessionRow))
    } catch {
      ui.error('Could not reach Warren server')
      ui.info(ui.c.dim('Start the host first: warren host start'))
    }
  },
})
