// Config management — reads/writes ~/.warren/config.json

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import type { WarrenConfig } from '@warren/types'

const CONFIG_DIR_NAME = '.warren'
const CONFIG_FILE_NAME = 'config.json'

export function getConfigDir(): string {
  const dir = join(homedir(), CONFIG_DIR_NAME)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true, mode: 0o700 })
  }
  return dir
}

function getConfigPath(): string {
  return join(getConfigDir(), CONFIG_FILE_NAME)
}

function defaultConfig(): WarrenConfig {
  return {
    nodeId: crypto.randomUUID(),
    hostMode: true,
    shell: process.env.SHELL ?? '/bin/zsh',
    port: 9470,
    theme: 'tokyo-night',
    logging: false,
  }
}

export function loadConfig(): WarrenConfig {
  const path = getConfigPath()

  if (!existsSync(path)) {
    const config = defaultConfig()
    saveConfig(config)
    return config
  }

  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<WarrenConfig>

    // Merge with defaults to handle missing fields from older versions
    return {
      ...defaultConfig(),
      ...parsed,
    }
  } catch {
    console.warn(`[warren] Failed to parse config at ${path}, using defaults`)
    return defaultConfig()
  }
}

export function saveConfig(config: WarrenConfig): void {
  const path = getConfigPath()
  writeFileSync(path, JSON.stringify(config, null, 2), { mode: 0o600 })
}

export function updateConfig(partial: Partial<WarrenConfig>): WarrenConfig {
  const current = loadConfig()
  const updated = { ...current, ...partial }
  saveConfig(updated)
  return updated
}
