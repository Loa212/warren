// Local type stubs for Electrobun.
// The published package ships TypeScript source with internal type errors.
// These stubs provide correct types for the APIs used in Warren's desktop app,
// bypassing Electrobun's source so TypeScript doesn't follow into its broken deps.
// Keep in sync with Electrobun v1.15+ API.

declare module 'electrobun/bun' {
  // -------------------------------------------------------------------------
  // Tray
  // -------------------------------------------------------------------------
  export interface TrayOptions {
    title?: string
    image?: string
    template?: boolean
    width?: number
    height?: number
  }

  export interface TrayMenuItem {
    type: 'normal' | 'separator'
    label?: string
    action?: string
  }

  export interface TrayClickedEvent {
    data?: { id: number; action: string; data?: unknown }
  }

  export class Tray {
    constructor(options?: TrayOptions)
    on(event: 'tray-clicked', handler: (event: TrayClickedEvent) => void): this
    setTitle(title: string): void
    setImage(image: string): void
    setMenu(items: TrayMenuItem[]): void
    remove(): void
  }

  // -------------------------------------------------------------------------
  // BrowserWindow
  // -------------------------------------------------------------------------
  export interface WindowFrame {
    x: number
    y: number
    width: number
    height: number
  }

  export interface WindowOptions {
    title: string
    frame: WindowFrame
    url?: string
    html?: string
    titleBarStyle?: 'hidden' | 'hiddenInset' | 'default'
    transparent?: boolean
    sandbox?: boolean
  }

  export class BrowserWindow {
    constructor(options: WindowOptions)
    close(): void
    focus(): void
    minimize(): void
    maximize(): void
    on(event: 'close', handler: () => void): this
  }
}

declare module 'electrobun' {
  // -------------------------------------------------------------------------
  // Config (used in electrobun.config.ts)
  // -------------------------------------------------------------------------
  export interface ElectrobunConfig {
    app: {
      name: string
      identifier: string
      version: string
      description?: string
      urlSchemes?: string[]
    }
    runtime?: {
      exitOnLastWindowClosed?: boolean
      [key: string]: unknown
    }
    build?: {
      bunVersion?: string
      useAsar?: boolean
      asarUnpack?: string[]
      watch?: string[]
      watchIgnore?: string[]
      bun?: {
        entrypoint: string
        external?: string[]
        minify?: boolean
        sourcemap?: 'none' | 'linked' | 'inline' | 'external'
        [key: string]: unknown
      }
      views?: Record<
        string,
        { entrypoint: string; [key: string]: unknown }
      >
      copy?: Record<string, string>
      mac?: {
        bundleCEF?: boolean
        defaultRenderer?: 'native' | 'cef'
        codesign?: boolean
        notarize?: boolean
        icons?: string
        entitlements?: Record<string, string>
        [key: string]: unknown
      }
      linux?: {
        bundleCEF?: boolean
        defaultRenderer?: 'native' | 'cef'
        [key: string]: unknown
      }
      win?: {
        bundleCEF?: boolean
        defaultRenderer?: 'native' | 'cef'
        [key: string]: unknown
      }
      [key: string]: unknown
    }
    scripts?: {
      preBuild?: string
      postBuild?: string
      postWrap?: string
      postPackage?: string
    }
    release?: {
      baseUrl?: string
    }
  }
}
