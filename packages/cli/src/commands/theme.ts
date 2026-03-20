// warren theme list|set|import|create — manage themes

import { loadConfig, updateConfig } from '@warren/core'
import { importHyperTheme, listThemes, loadTheme, saveCustomTheme } from '@warren/themes'
import type { WarrenTheme } from '@warren/types'
import { defineCommand } from 'citty'
import * as ui from '../ui'

export function createThemeScaffold(name: string): WarrenTheme {
  return {
    name,
    author: 'custom',
    version: '1.0.0',
    colors: {
      background: '#1a1b26',
      foreground: '#a9b1d6',
      cursor: '#c0caf5',
      cursorAccent: '#1a1b26',
      selection: '#33467c',
      black: '#15161e',
      red: '#f7768e',
      green: '#9ece6a',
      yellow: '#e0af68',
      blue: '#7aa2f7',
      magenta: '#bb9af7',
      cyan: '#7dcfff',
      white: '#a9b1d6',
      brightBlack: '#414868',
      brightRed: '#f7768e',
      brightGreen: '#9ece6a',
      brightYellow: '#e0af68',
      brightBlue: '#7aa2f7',
      brightMagenta: '#bb9af7',
      brightCyan: '#7dcfff',
      brightWhite: '#c0caf5',
    },
    ui: {
      accent: '#7aa2f7',
      border: '#292e42',
      tabBar: '#1a1b26',
      activeTab: '#292e42',
    },
    font: {
      family: 'JetBrains Mono, monospace',
      size: 14,
      lineHeight: 1.5,
    },
  }
}

export const themeCommand = defineCommand({
  meta: { name: 'theme', description: 'Manage themes' },
  subCommands: {
    list: defineCommand({
      meta: { name: 'list', description: 'List available themes' },
      run() {
        const config = loadConfig()
        const themes = listThemes()

        if (themes.length === 0) {
          ui.info('No themes found')
          return
        }

        for (const name of themes) {
          const marker = name === config.theme ? ui.c.green(' ●') : '  '
          console.log(`${marker} ${name}`)
        }
      },
    }),

    set: defineCommand({
      meta: { name: 'set', description: 'Set the active theme' },
      args: {
        name: {
          type: 'positional',
          description: 'Theme name',
          required: true,
        },
      },
      run({ args }) {
        const name = String(args.name)
        try {
          loadTheme(name) // Validate theme exists
          updateConfig({ theme: name })
          ui.success(`Theme set to: ${name}`)
        } catch {
          ui.error(`Theme not found: ${name}`)
          ui.info(ui.c.dim('List available themes: warren theme list'))
        }
      },
    }),

    import: defineCommand({
      meta: { name: 'import', description: 'Import a Hyper theme from npm' },
      args: {
        package: {
          type: 'positional',
          description: 'Hyper theme npm package name',
          required: true,
        },
      },
      async run({ args }) {
        const pkg = String(args.package)
        ui.info(`Importing Hyper theme: ${pkg}...`)
        try {
          const theme = await importHyperTheme(pkg)
          ui.success(`Imported theme: ${theme.name}`)
          const slug = theme.name.toLowerCase().replace(/\s+/g, '-')
          ui.info(ui.c.dim(`Set it with: warren theme set ${slug}`))
        } catch (err) {
          ui.error(`Failed to import: ${(err as Error).message}`)
        }
      },
    }),

    create: defineCommand({
      meta: { name: 'create', description: 'Create a new theme scaffold' },
      args: {
        name: {
          type: 'positional',
          description: 'Theme name',
          required: true,
        },
      },
      run({ args }) {
        const name = String(args.name)
        const theme = createThemeScaffold(name)
        saveCustomTheme(theme)
        const slug = name
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
        ui.success(`Created theme scaffold: ~/.warren/themes/${slug}.json`)
        ui.info(ui.c.dim(`Edit the file to customize colors, then: warren theme set ${slug}`))
      },
    }),
  },
})
