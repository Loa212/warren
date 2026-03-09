// Theme loader + xterm.js applicator

import type { Terminal } from 'xterm'
import type { WarrenTheme } from '@warren/types'

// Built-in themes are bundled as JSON — imported directly by Vite
import tokyoNight from '../../../../packages/themes/src/defaults/tokyo-night.json'
import rabbitHole from '../../../../packages/themes/src/defaults/rabbit-hole.json'
import snowWarren from '../../../../packages/themes/src/defaults/snow-warren.json'

// Type assertion: JSON files match WarrenTheme shape
const BUILT_IN_THEMES: Record<string, WarrenTheme> = {
  'tokyo-night': tokyoNight as WarrenTheme,
  'rabbit-hole': rabbitHole as WarrenTheme,
  'snow-warren': snowWarren as WarrenTheme,
}

export function getTheme(name: string): WarrenTheme {
  // Check built-ins
  const builtin = BUILT_IN_THEMES[name]
  if (builtin) return builtin

  // Check localStorage custom themes
  try {
    const raw = localStorage.getItem(`warren:theme:${name}`)
    if (raw) return JSON.parse(raw) as WarrenTheme
  } catch {
    // fall through
  }

  // Default fallback
  return BUILT_IN_THEMES['tokyo-night']!
}

export function applyTheme(terminal: Terminal, name: string): void {
  const theme = getTheme(name)

  terminal.options.theme = {
    background: theme.colors.background,
    foreground: theme.colors.foreground,
    cursor: theme.colors.cursor,
    cursorAccent: theme.colors.cursorAccent,
    selectionBackground: theme.colors.selection,
    black: theme.colors.black,
    red: theme.colors.red,
    green: theme.colors.green,
    yellow: theme.colors.yellow,
    blue: theme.colors.blue,
    magenta: theme.colors.magenta,
    cyan: theme.colors.cyan,
    white: theme.colors.white,
    brightBlack: theme.colors.brightBlack,
    brightRed: theme.colors.brightRed,
    brightGreen: theme.colors.brightGreen,
    brightYellow: theme.colors.brightYellow,
    brightBlue: theme.colors.brightBlue,
    brightMagenta: theme.colors.brightMagenta,
    brightCyan: theme.colors.brightCyan,
    brightWhite: theme.colors.brightWhite,
  }

  if (theme.font) {
    if (theme.font.family) terminal.options.fontFamily = theme.font.family
    if (theme.font.size) terminal.options.fontSize = theme.font.size
    if (theme.font.lineHeight) terminal.options.lineHeight = theme.font.lineHeight
  }

  // Apply UI CSS vars for chrome (toolbar, tabs, etc.)
  if (theme.ui) {
    const root = document.documentElement
    if (theme.ui.accent) root.style.setProperty('--accent', theme.ui.accent)
    if (theme.ui.border) root.style.setProperty('--border', theme.ui.border)
    if (theme.ui.tabBar) root.style.setProperty('--bg', theme.ui.tabBar)
  }

  // Persist selection
  localStorage.setItem('warren:theme', name)
}

export function listAvailableThemes(): string[] {
  const builtin = Object.keys(BUILT_IN_THEMES)
  const custom: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('warren:theme:')) {
      custom.push(key.replace('warren:theme:', ''))
    }
  }

  return [...builtin, ...custom]
}
