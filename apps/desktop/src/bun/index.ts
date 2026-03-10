// Warren Desktop — Electrobun main process
//
// Electrobun APIs verified against v1.15.1.
// Docs: https://blackboard.sh/electrobun/docs/

import { generateToken, getOrCreateIdentity, loadConfig, startServer } from '@warren/core'
import { BrowserWindow, Tray } from 'electrobun/bun'

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
  staticDir: new URL('../../../../web/dist', import.meta.url).pathname,
  config,
})

console.log(`[warren] Server started on port ${config.port}`)
console.log(`[warren] Token: ${token} (v0.1 fallback)`)
console.log(`[warren] Public key: ${identity.publicKey}`)

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------

// TODO: Convert iconTemplate.svg to a 32x32 PNG template image for macOS
const tray = new Tray({
  image: 'views://assets/iconTemplate.svg',
  template: true,
  title: '',
})

tray.setMenu([
  { type: 'normal', label: 'Open Dashboard', action: 'dashboard' },
  { type: 'separator' },
  { type: 'normal', label: 'Quit Warren', action: 'quit' },
])

tray.on('tray-clicked', () => {
  toggleDashboard()
})

tray.on('tray-item-clicked', (_event) => {
  const action = _event?.data?.action
  if (action === 'dashboard') {
    showDashboard()
  } else if (action === 'quit') {
    server.stop()
    tray.remove()
    process.exit(0)
  }
})

// ---------------------------------------------------------------------------
// Dashboard Window
// ---------------------------------------------------------------------------

let dashboardWindow: InstanceType<typeof BrowserWindow> | null = null

function showDashboard(): void {
  if (dashboardWindow) {
    dashboardWindow.focus()
    return
  }

  dashboardWindow = new BrowserWindow({
    title: 'Warren',
    url: 'views://dashboard/index.html',
    frame: { x: 100, y: 100, width: 900, height: 600 },
    titleBarStyle: 'hiddenInset',
  })

  dashboardWindow.on('close', () => {
    dashboardWindow = null
  })
}

function toggleDashboard(): void {
  if (dashboardWindow) {
    dashboardWindow.close()
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
  tray.remove()
  process.exit(0)
})
