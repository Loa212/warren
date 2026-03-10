// Electrobun configuration for Warren desktop app
// Docs: https://blackboard.sh/electrobun/docs/apis/cli/build-configuration

import type { ElectrobunConfig } from 'electrobun'

export default {
  app: {
    name: 'Warren',
    identifier: 'sh.warren.app',
    version: '0.1.0',
  },
  runtime: {
    // Tray apps must keep running when all windows are closed
    exitOnLastWindowClosed: false,
  },
  build: {
    bun: {
      entrypoint: 'src/bun/index.ts',
    },
    views: {
      dashboard: {
        entrypoint: 'src/dashboard/index.ts',
      },
    },
    copy: {
      'src/dashboard/index.html': 'views/dashboard/index.html',
      'src/assets/iconTemplate.svg': 'views/assets/iconTemplate.svg',
    },
    mac: {
      bundleCEF: false,
    },
    linux: {
      bundleCEF: false,
    },
    win: {
      bundleCEF: false,
    },
  },
} satisfies ElectrobunConfig
