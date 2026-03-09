// Electrobun configuration for Warren desktop app
// Docs: https://blackboard.sh/electrobun/docs/

import type { ElectrobunConfig } from 'electrobun'

const config: ElectrobunConfig = {
  app: {
    name: 'Warren',
    version: '0.1.0',
    identifier: 'sh.warren.app',
  },
  build: {
    bun: {
      entrypoint: 'src/index.ts',
    },
    views: {
      dashboard: {
        entrypoint: 'src/views/dashboard/api.ts',
      },
    },
  },
}

export default config
