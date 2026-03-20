#!/usr/bin/env bun
// @warren/cli — Warren terminal mesh CLI

import { defineCommand, runMain } from 'citty'
import { configCommand } from './commands/config'
import { connectCommand } from './commands/connect'
import { devicesCommand } from './commands/devices'
import { hostCommand } from './commands/host'
import { pairCommand } from './commands/pair'
import { sessionsCommand } from './commands/sessions'
import { themeCommand } from './commands/theme'
import { tunnelCommand } from './commands/tunnel'

const main = defineCommand({
  meta: {
    name: 'warren',
    version: '0.1.0',
    description: '🐇 Warren CLI — your terminal mesh',
  },
  subCommands: {
    host: hostCommand,
    pair: pairCommand,
    devices: devicesCommand,
    connect: connectCommand,
    sessions: sessionsCommand,
    theme: themeCommand,
    tunnel: tunnelCommand,
    config: configCommand,
  },
})

runMain(main)
