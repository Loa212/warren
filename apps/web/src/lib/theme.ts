// Theme loader — applies theme to both xterm.js terminals and the app UI

import type { Terminal } from 'xterm'
import type { WarrenTheme } from '@warren/types'

import tokyoNight from '../../../../packages/themes/src/defaults/tokyo-night.json'
import rabbitHole from '../../../../packages/themes/src/defaults/rabbit-hole.json'
import snowWarren from '../../../../packages/themes/src/defaults/snow-warren.json'
import catppuccinLatte from '../../../../packages/themes/src/defaults/catppuccin-latte.json'
import catppuccinMocha from '../../../../packages/themes/src/defaults/catppuccin-mocha.json'

const BUILT_IN_THEMES: Record<string, WarrenTheme> = {
  'tokyo-night': tokyoNight as WarrenTheme,
  'rabbit-hole': rabbitHole as WarrenTheme,
  'snow-warren': snowWarren as WarrenTheme,
  'catppuccin-latte': catppuccinLatte as WarrenTheme,
  'catppuccin-mocha': catppuccinMocha as WarrenTheme,
}

export function getTheme(name: string): WarrenTheme {
  const builtin = BUILT_IN_THEMES[name]
  if (builtin) return builtin

  try {
    const raw = localStorage.getItem(`warren:theme:${name}`)
    if (raw) return JSON.parse(raw) as WarrenTheme
  } catch {
    // fall through
  }

  return BUILT_IN_THEMES['tokyo-night']!
}

/** Parse hex to [r, g, b] */
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ]
}

/** Perceived luminance (0–1) */
function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/** Mix two hex colors at ratio t (0 = a, 1 = b) */
function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `#${[mix(ar, br), mix(ag, bg), mix(ab, bb)].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Apply theme to the whole app UI via CSS custom properties */
export function applyAppTheme(name: string): void {
  const theme = getTheme(name)
  const root = document.documentElement
  const bg = theme.colors.background
  const fg = theme.colors.foreground
  const accent = theme.ui?.accent ?? theme.colors.blue
  const border = theme.ui?.border ?? mixHex(bg, fg, 0.15)
  const tabBar = theme.ui?.tabBar ?? mixHex(bg, fg, 0.05)
  const isLight = luminance(bg) > 0.5

  const set = (k: string, v: string) => root.style.setProperty(k, v)

  set('--background', bg)
  set('--foreground', fg)
  set('--card', tabBar)
  set('--card-foreground', fg)
  set('--popover', tabBar)
  set('--popover-foreground', fg)
  set('--primary', accent)
  // primary-foreground must contrast the accent, not the background
  set('--primary-foreground', luminance(accent) > 0.4 ? '#0a0a0a' : '#ffffff')
  set('--secondary', mixHex(bg, fg, 0.08))
  set('--secondary-foreground', fg)
  set('--muted', mixHex(bg, fg, 0.08))
  set('--muted-foreground', mixHex(bg, fg, 0.4))
  set('--accent', mixHex(bg, fg, 0.08))
  set('--accent-foreground', fg)
  set('--destructive', isLight ? '#c62828' : theme.colors.red)
  set('--border', border)
  set('--input', border)
  set('--ring', accent)

  // Update meta theme-color for mobile browser chrome
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', bg)

  localStorage.setItem('warren:theme', name)
}

/** Apply theme to an xterm.js terminal instance */
export function applyTerminalTheme(terminal: Terminal, name: string): void {
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
}

/** Apply theme everywhere — UI + all active terminals */
export function applyThemeEverywhere(name: string, terminals: Terminal[]): void {
  applyAppTheme(name)
  for (const t of terminals) applyTerminalTheme(t, name)
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
