// Warren Desktop — Electrobun main process
//
// Electrobun APIs verified against v1.15.1.
// Docs: https://blackboard.sh/electrobun/docs/

import { existsSync } from 'node:fs'
import {
  generateToken,
  getOrCreateIdentity,
  listPairedDevices,
  loadConfig,
  startServer,
  updateConfig,
} from '@warren/core'
import { BrowserWindow, Tray } from 'electrobun/bun'

// ---------------------------------------------------------------------------
// Config & Server
// ---------------------------------------------------------------------------

const config = loadConfig()

// v0.2: X25519 keypair for ECDH pairing + fallback token for v0.1 clients
const identity = getOrCreateIdentity()
const token = generateToken()

// Only serve static files if the web dist exists (production build).
// In dev mode (no build), omit staticDir so pair QR points to Vite at :3999.
const webDistPath = new URL('../../../../web/dist', import.meta.url).pathname
const server = startServer({
  port: config.port,
  token,
  staticDir: existsSync(webDistPath) ? webDistPath : undefined,
  config,
})

console.log(`[warren] Server started on port ${config.port}`)
console.log(`[warren] Token: ${token} (v0.1 fallback)`)
console.log(`[warren] Public key: ${identity.publicKey}`)

// ---------------------------------------------------------------------------
// Tray
// ---------------------------------------------------------------------------

let hostMode = config.hostMode

function buildTrayMenu() {
  const devices = listPairedDevices()
  const activeCount = devices.filter((d) => d.permission === 'full').length

  return [
    {
      type: 'normal' as const,
      label: `Host Mode: ${hostMode ? 'On' : 'Off'}`,
      action: 'toggle-host',
    },
    {
      type: 'normal' as const,
      label: `Devices: ${activeCount} paired`,
      action: 'noop',
    },
    { type: 'separator' as const },
    { type: 'normal' as const, label: 'Show QR Code', action: 'qr' },
    { type: 'normal' as const, label: 'Open Dashboard', action: 'dashboard' },
    { type: 'separator' as const },
    { type: 'normal' as const, label: 'Quit Warren', action: 'quit' },
  ]
}

// TODO: Convert iconTemplate.svg to a 32x32 PNG template image for macOS
const tray = new Tray({
  image: 'views://assets/iconTemplate.svg',
  template: true,
  title: '',
})

function refreshTray(): void {
  tray.setMenu(buildTrayMenu())
}

refreshTray()

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
  } else if (action === 'toggle-host') {
    hostMode = !hostMode
    updateConfig({ hostMode })
    refreshTray()
    console.log(`[warren] Host mode: ${hostMode ? 'on' : 'off'}`)
  } else if (action === 'qr') {
    showDashboard()
    // The dashboard will auto-trigger pairing QR display
  }
})

// Refresh tray menu periodically to update device count
const trayRefreshInterval = setInterval(refreshTray, 30_000)

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
  clearInterval(trayRefreshInterval)
  server.stop()
  tray.remove()
  process.exit(0)
})
