// Hyper Theme Importer
//
// Converts Hyper terminal themes to Warren's native JSON format.
//
// Hyper theme format (from npm package's index.js):
//   module.exports = {
//     colors: { black, red, green, ... },
//     backgroundColor: '#...',
//     foregroundColor: '#...',
//     cursorColor: '#...',
//     cursorAccentColor: '#...',
//     selectionColor: '#...',
//     borderColor: '#...',
//     ...
//   }
//
// Usage:
//   const theme = importHyperTheme('hyper-snazzy')
//   saveCustomTheme(theme)

import type { WarrenTheme } from '@warren/types'
import { saveCustomTheme } from './loader'

interface HyperThemeExport {
  colors?: {
    black?: string
    red?: string
    green?: string
    yellow?: string
    blue?: string
    magenta?: string
    cyan?: string
    white?: string
    lightBlack?: string
    lightRed?: string
    lightGreen?: string
    lightYellow?: string
    lightBlue?: string
    lightMagenta?: string
    lightCyan?: string
    lightWhite?: string
  }
  backgroundColor?: string
  foregroundColor?: string
  cursorColor?: string
  cursorAccentColor?: string
  selectionColor?: string
  borderColor?: string
  // Some themes use these aliases
  background?: string
  foreground?: string
  cursor?: string
}

/**
 * Convert a Hyper theme export object to Warren's theme format.
 */
export function convertHyperTheme(
  hyperTheme: HyperThemeExport,
  meta: { name: string; author?: string },
): WarrenTheme {
  const colors = hyperTheme.colors ?? {}
  const bg = hyperTheme.backgroundColor ?? hyperTheme.background ?? '#1a1b26'
  const fg = hyperTheme.foregroundColor ?? hyperTheme.foreground ?? '#a9b1d6'
  const cursor = hyperTheme.cursorColor ?? hyperTheme.cursor ?? fg

  return {
    name: meta.name,
    author: meta.author ?? 'hyper-import',
    version: '1.0.0',
    colors: {
      background: bg,
      foreground: fg,
      cursor,
      cursorAccent: hyperTheme.cursorAccentColor ?? bg,
      selection: hyperTheme.selectionColor ?? '#33467c',
      black: colors.black ?? '#000000',
      red: colors.red ?? '#ff5555',
      green: colors.green ?? '#50fa7b',
      yellow: colors.yellow ?? '#f1fa8c',
      blue: colors.blue ?? '#bd93f9',
      magenta: colors.magenta ?? '#ff79c6',
      cyan: colors.cyan ?? '#8be9fd',
      white: colors.white ?? '#f8f8f2',
      brightBlack: colors.lightBlack ?? '#44475a',
      brightRed: colors.lightRed ?? '#ff6e6e',
      brightGreen: colors.lightGreen ?? '#69ff94',
      brightYellow: colors.lightYellow ?? '#ffffa5',
      brightBlue: colors.lightBlue ?? '#d6acff',
      brightMagenta: colors.lightMagenta ?? '#ff92df',
      brightCyan: colors.lightCyan ?? '#a4ffff',
      brightWhite: colors.lightWhite ?? '#ffffff',
    },
    ui: {
      border: hyperTheme.borderColor,
    },
  }
}

/**
 * Import a Hyper theme from an npm package name.
 *
 * Requires the package to be installed (bun add <packageName>) or
 * available via dynamic import.
 *
 * For v0.1: Attempts a dynamic require of the package. In practice,
 * you may need to run `bun add <packageName>` first.
 */
export async function importHyperTheme(npmPackageName: string): Promise<WarrenTheme> {
  // TODO(v0.2): Use a more robust loader that handles various Hyper theme export patterns.
  // Some themes export via ESM default export, some use CommonJS module.exports.
  // Consider running the package in a sandboxed eval to extract the config.

  let hyperExport: HyperThemeExport
  try {
    // Dynamic import — works if the package is installed in the workspace
    const mod = (await import(npmPackageName)) as { default?: HyperThemeExport } & HyperThemeExport
    hyperExport = mod.default ?? mod
  } catch {
    throw new Error(
      `Failed to import Hyper theme "${npmPackageName}". ` +
        `Make sure to run: bun add ${npmPackageName}`,
    )
  }

  // Extract theme name from package name (hyper-snazzy → Snazzy)
  const rawName = npmPackageName.replace(/^hyper-/, '')
  const name = rawName
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')

  const theme = convertHyperTheme(hyperExport, { name, author: npmPackageName })
  saveCustomTheme(theme)
  return theme
}
