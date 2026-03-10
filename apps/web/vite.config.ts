import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/route-tree.gen.ts',
      quoteStyle: 'single',
    }),
    react(),
    tailwindcss(),
  ],
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@warren/types': resolve(__dirname, '../../packages/types/src/index.ts'),
      '@warren/themes': resolve(__dirname, '../../packages/themes/src/index.ts'),
    },
  },
  server: {
    port: 3000,
    host: true,
    watch: {
      ignored: ['**/route-tree.gen.ts'],
    },
  },
})
