import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@warren/types': resolve(__dirname, '../../packages/types/src/index.ts'),
      '@warren/themes': resolve(__dirname, '../../packages/themes/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    host: true, // expose on LAN for phone testing
  },
})
