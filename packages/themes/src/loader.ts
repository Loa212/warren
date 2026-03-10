// Theme loader — loads themes from defaults or custom paths

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, extname, join } from 'node:path'
import type { WarrenTheme } from '@warren/types'

const DEFAULTS_DIR = new URL('./defaults', import.meta.url).pathname

function getCustomThemesDir(): string {
  const dir = join(homedir(), '.warren', 'themes')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

function isValidTheme(obj: unknown): obj is WarrenTheme {
  if (typeof obj !== 'object' || obj === null) return false
  const t = obj as Record<string, unknown>
  return typeof t.name === 'string' && typeof t.author === 'string' && typeof t.colors === 'object'
}

function loadFromPath(filePath: string): WarrenTheme {
  const raw = readFileSync(filePath, 'utf-8')
  const parsed = JSON.parse(raw) as unknown
  if (!isValidTheme(parsed)) {
    throw new Error(`Invalid theme format at: ${filePath}`)
  }
  return parsed
}

/**
 * Load a theme by name (default or custom) or by absolute file path.
 *
 * Resolution order:
 *   1. Absolute path (if nameOrPath starts with /)
 *   2. Custom themes (~/.warren/themes/<name>.json)
 *   3. Built-in defaults (packages/themes/src/defaults/<name>.json)
 */
export function loadTheme(nameOrPath: string): WarrenTheme {
  // Absolute path
  if (nameOrPath.startsWith('/')) {
    if (!existsSync(nameOrPath)) {
      throw new Error(`Theme file not found: ${nameOrPath}`)
    }
    return loadFromPath(nameOrPath)
  }

  const slug = nameOrPath.replace(/\.json$/, '')

  // Custom themes
  const customPath = join(getCustomThemesDir(), `${slug}.json`)
  if (existsSync(customPath)) {
    return loadFromPath(customPath)
  }

  // Built-in defaults
  const defaultPath = join(DEFAULTS_DIR, `${slug}.json`)
  if (existsSync(defaultPath)) {
    return loadFromPath(defaultPath)
  }

  throw new Error(`Theme not found: "${nameOrPath}". Run listThemes() to see available themes.`)
}

/**
 * List all available themes (built-ins + custom).
 * Returns theme names (without .json extension).
 */
export function listThemes(): string[] {
  const themes: string[] = []

  // Built-in defaults
  if (existsSync(DEFAULTS_DIR)) {
    for (const file of readdirSync(DEFAULTS_DIR)) {
      if (extname(file) === '.json') {
        themes.push(basename(file, '.json'))
      }
    }
  }

  // Custom themes
  const customDir = getCustomThemesDir()
  for (const file of readdirSync(customDir)) {
    if (extname(file) === '.json') {
      const name = basename(file, '.json')
      if (!themes.includes(name)) {
        themes.push(name)
      }
    }
  }

  return themes.sort()
}

/**
 * Save a custom theme to ~/.warren/themes/<theme.name>.json
 */
export function saveCustomTheme(theme: WarrenTheme): void {
  const slug = theme.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  const path = join(getCustomThemesDir(), `${slug}.json`)
  writeFileSync(path, JSON.stringify(theme, null, 2))
}
