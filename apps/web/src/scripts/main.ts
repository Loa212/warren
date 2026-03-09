// Warren PWA — main entry point and router
// Manages navigation between lock screen, config screen, and terminal screen

import { initLock } from './lock'
import { initConfig } from './config'
import { initTerminal } from './terminal'

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    console.warn('[warren] SW registration failed:', err)
  })
}

export type Screen = 'lock' | 'config' | 'terminal'

export function showScreen(screen: Screen): void {
  const lockEl = document.getElementById('lock-screen')!
  const configEl = document.getElementById('config-screen')!
  const terminalEl = document.getElementById('terminal-screen')!

  lockEl.classList.add('hidden')
  configEl.classList.add('hidden')
  terminalEl.classList.add('hidden')

  if (screen === 'lock') lockEl.classList.remove('hidden')
  else if (screen === 'config') configEl.classList.remove('hidden')
  else if (screen === 'terminal') terminalEl.classList.remove('hidden')
}

function init(): void {
  // Initialize all screens (they self-hide until activated)
  initLock(() => showScreen('config'))
  initConfig({
    onConnect: (host, token) => {
      showScreen('terminal')
      initTerminal(host, token)
    },
  })

  // Determine initial screen
  // If PIN is set → lock screen; else → config screen
  const hasPin = localStorage.getItem('warren:pin') !== null
  showScreen(hasPin ? 'lock' : 'config')
}

init()
