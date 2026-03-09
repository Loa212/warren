// Local type stub for Electrobun.
// The published package ships TypeScript source with internal type errors.
// This stub provides correct types for the APIs used in Warren's desktop app,
// bypassing Electrobun's source so TypeScript doesn't follow into its broken deps.
// Keep in sync with Electrobun v1.15+ API.

export interface TrayOptions {
  title?: string
  image?: string
  template?: boolean
  width?: number
  height?: number
}

export declare class Tray {
  constructor(options?: TrayOptions)
  on(event: 'tray-clicked', handler: () => void): this
  setTitle(title: string): void
  setImage(image: string): void
}

export interface WindowFrame {
  x: number
  y: number
  width: number
  height: number
}

export interface WindowOptions {
  title: string
  frame: WindowFrame
  url?: string | null
  html?: string | null
  preload?: string | null
  renderer?: 'native' | 'cef'
  titleBarStyle?: 'hidden' | 'hiddenInset' | 'default'
  transparent?: boolean
  navigationRules?: string | null
  sandbox?: boolean
}

export declare class BrowserWindow {
  constructor(options: WindowOptions)
  close(): void
  focus(): void
}

export interface ElectrobunConfig {
  app: {
    name: string
    identifier: string
    version: string
    description?: string
    urlSchemes?: string[]
  }
  build?: {
    bun?: { entrypoint?: string; [key: string]: unknown }
    views?: Record<string, { entrypoint: string; [key: string]: unknown }>
    copy?: Record<string, string>
    [key: string]: unknown
  }
}
