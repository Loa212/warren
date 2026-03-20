// Command handler unit tests

import { describe, expect, it } from 'bun:test'
import type { StoredDevice } from '@warren/core'
import { loadConfig } from '@warren/core'
import { listThemes } from '@warren/themes'
import type { TerminalSession } from '@warren/types'
import { formatConfigValue } from '../commands/config'
import { formatDeviceRow } from '../commands/devices'
import { formatSessionRow } from '../commands/sessions'
import { createThemeScaffold } from '../commands/theme'

// ── Config ──────────────────────────────────────────────────────────────────

describe('Config command helpers', () => {
  it('should format boolean true as green', () => {
    const result = formatConfigValue('hostMode', true)
    expect(result).toContain('true')
    expect(result).toContain('\x1b[32m') // green
  })

  it('should format boolean false as dim', () => {
    const result = formatConfigValue('logging', false)
    expect(result).toContain('false')
    expect(result).toContain('\x1b[2m') // dim
  })

  it('should dim nodeId values', () => {
    const result = formatConfigValue('nodeId', 'abc-123')
    expect(result).toContain('abc-123')
    expect(result).toContain('\x1b[2m')
  })

  it('should format string values as-is', () => {
    const result = formatConfigValue('shell', '/bin/zsh')
    expect(result).toBe('/bin/zsh')
  })

  it('should format number values as-is', () => {
    const result = formatConfigValue('port', 9470)
    expect(result).toBe('9470')
  })

  it('should load config without error', () => {
    const config = loadConfig()
    expect(config).toBeDefined()
    expect(config.nodeId).toBeString()
    expect(typeof config.port).toBe('number')
    expect(typeof config.hostMode).toBe('boolean')
  })
})

// ── Devices ─────────────────────────────────────────────────────────────────

describe('Devices command helpers', () => {
  it('should format an active device row', () => {
    const device: StoredDevice = {
      id: 'abcdefgh-1234-5678-9012-abcdefghijkl',
      name: 'Test Phone',
      publicKey: 'dGVzdA==',
      sharedSecret: 'dGVzdA==',
      pairedAt: 1700000000000,
      lastSeen: 1700001000000,
      permission: 'full',
    }

    const row = formatDeviceRow(device)
    expect(row).toHaveLength(5)
    expect(row[0]).toBe('abcdefgh')
    expect(row[1]).toBe('Test Phone')
    expect(row[2]).toContain('active')
  })

  it('should show revoked status for revoked devices', () => {
    const device: StoredDevice = {
      id: 'revoked0-1234-5678-9012-abcdefghijkl',
      name: 'Old Device',
      publicKey: 'dGVzdA==',
      sharedSecret: 'dGVzdA==',
      pairedAt: 1700000000000,
      lastSeen: 1700000000000,
      permission: 'revoked',
    }

    const row = formatDeviceRow(device)
    expect(row[2]).toContain('revoked')
  })
})

// ── Sessions ────────────────────────────────────────────────────────────────

describe('Sessions command helpers', () => {
  it('should format a session row', () => {
    const session: TerminalSession = {
      id: 'sess-1234-5678-9012-abcdefghijkl',
      deviceId: 'dev-abcd-1234-5678-9012efghijkl',
      shell: '/bin/zsh',
      startedAt: Date.now(),
      cols: 120,
      rows: 40,
    }

    const row = formatSessionRow(session)
    expect(row).toHaveLength(5)
    expect(row[0]).toBe('sess-123')
    expect(row[1]).toBe('dev-abcd')
    expect(row[2]).toBe('/bin/zsh')
    expect(row[4]).toBe('120x40')
  })

  it('should handle empty deviceId', () => {
    const session: TerminalSession = {
      id: 'sess-0000-0000-0000-000000000000',
      deviceId: '',
      shell: '/bin/bash',
      startedAt: Date.now(),
      cols: 80,
      rows: 24,
    }

    const row = formatSessionRow(session)
    expect(row[1]).toBe('—')
    expect(row[4]).toBe('80x24')
  })
})

// ── Themes ──────────────────────────────────────────────────────────────────

describe('Theme command helpers', () => {
  it('should list available themes', () => {
    const themes = listThemes()
    expect(themes.length).toBeGreaterThan(0)
    expect(themes).toContain('tokyo-night')
  })

  it('should create a valid theme scaffold', () => {
    const theme = createThemeScaffold('My Theme')
    expect(theme.name).toBe('My Theme')
    expect(theme.author).toBe('custom')
    expect(theme.version).toBe('1.0.0')
    expect(theme.colors.background).toBe('#1a1b26')
    expect(theme.colors.foreground).toBe('#a9b1d6')
    expect(Object.keys(theme.colors)).toHaveLength(21)
    expect(theme.ui).toBeDefined()
    expect(theme.font).toBeDefined()
  })

  it('should include all required ANSI colors in scaffold', () => {
    const theme = createThemeScaffold('Test')
    const { colors } = theme
    // 16 ANSI colors
    expect(colors.black).toBeDefined()
    expect(colors.red).toBeDefined()
    expect(colors.green).toBeDefined()
    expect(colors.yellow).toBeDefined()
    expect(colors.blue).toBeDefined()
    expect(colors.magenta).toBeDefined()
    expect(colors.cyan).toBeDefined()
    expect(colors.white).toBeDefined()
    expect(colors.brightBlack).toBeDefined()
    expect(colors.brightRed).toBeDefined()
    expect(colors.brightGreen).toBeDefined()
    expect(colors.brightYellow).toBeDefined()
    expect(colors.brightBlue).toBeDefined()
    expect(colors.brightMagenta).toBeDefined()
    expect(colors.brightCyan).toBeDefined()
    expect(colors.brightWhite).toBeDefined()
  })
})
