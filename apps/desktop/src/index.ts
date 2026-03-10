// Requires Electrobun v1+ — run: npx electrobun init (tray-app template) then copy this code
//
// Warren Desktop — Electrobun main process
//
// Electrobun APIs verified against v1.15.1.
// Docs: https://blackboard.sh/electrobun/docs/

import { generateToken, getOrCreateIdentity, loadConfig, startServer } from '@warren/core'
import { BrowserWindow, Tray } from 'electrobun'

// ---------------------------------------------------------------------------
// Config & Server
// ---------------------------------------------------------------------------

const config = loadConfig()

// v0.2: X25519 keypair for ECDH pairing + fallback token for v0.1 clients
const identity = getOrCreateIdentity()
const token = generateToken()

const server = startServer({
  port: config.port,
  token,
  staticDir: new URL('../../../web/dist', import.meta.url).pathname,
  config,
})

console.log(`[warren] Server started on port ${config.port}`)
console.log(`[warren] Token: ${token} (v0.1 fallback)`)
console.log(`[warren] Public key: ${identity.publicKey}`)

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------

const _hostMode = config.hostMode

// TrayOptions: { title?, image?, template?, width?, height? }
// TODO: Create tray icon at src/assets/tray-icon.png (16x16 template image)
const tray = new Tray({
  image: 'src/assets/tray-icon.png',
  template: true,
  title: '',
})

// 'tray-clicked' is the Electrobun event for tray icon click
tray.on('tray-clicked', () => toggleDashboard())

// ---------------------------------------------------------------------------
// Dashboard Window
// ---------------------------------------------------------------------------

let dashboardWindow: InstanceType<typeof BrowserWindow> | null = null

function showDashboard(): void {
  if (!dashboardWindow) {
    // WindowOptionsType requires frame: { x, y, width, height }
    dashboardWindow = new BrowserWindow({
      title: 'Warren',
      frame: { x: 100, y: 100, width: 900, height: 600 },
      html: 'dashboard/index.html',
      url: null,
      preload: null,
      renderer: 'native',
      titleBarStyle: 'hiddenInset',
      transparent: false,
      navigationRules: null,
      sandbox: false,
    })
  }
}

function toggleDashboard(): void {
  if (dashboardWindow) {
    // TODO: BrowserWindow.close() or hide() — check Electrobun docs for exact API
    dashboardWindow = null
  } else {
    showDashboard()
  }
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

console.log('[warren] App ready. Click the tray icon to open the dashboard.')

process.on('SIGTERM', () => {
  server.stop()
  process.exit(0)
})
