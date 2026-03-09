// Config screen — host list + add host modal + settings

import { getHosts, addHost, removeHost, updateHostLastConnected } from './connection'

interface ConfigOptions {
  onConnect: (host: string, token: string) => void
}

export function initConfig(options: ConfigOptions): void {
  const hostList = document.getElementById('host-list')!
  const emptyState = document.getElementById('empty-state')!
  const addModal = document.getElementById('add-host-modal')!
  const settingsPanel = document.getElementById('settings-panel')!

  // Render host list
  function renderHosts(): void {
    // Remove existing host cards (keep empty state)
    const cards = hostList.querySelectorAll('.host-card')
    for (const card of cards) card.remove()

    const hosts = getHosts()
    emptyState.style.display = hosts.length === 0 ? '' : 'none'

    for (const host of hosts) {
      const card = document.createElement('div')
      card.className = 'host-card'
      card.innerHTML = `
        <div class="host-card-info">
          <h3>${escapeHtml(host.name || host.address)}</h3>
          <p>${escapeHtml(host.address)}${host.lastConnected ? ` · ${timeSince(host.lastConnected)}` : ''}</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="status-dot"></div>
        </div>
      `
      card.addEventListener('click', () => {
        updateHostLastConnected(host.id)
        options.onConnect(host.address, host.token)
        renderHosts()
      })
      hostList.insertBefore(card, emptyState)
    }
  }

  renderHosts()

  // Add host button
  const btnAdd = document.getElementById('btn-add-host')!
  const btnAddFirst = document.getElementById('btn-add-first')!
  const btnCancel = document.getElementById('btn-cancel-add')!
  const btnConfirm = document.getElementById('btn-confirm-add')!
  const inputHost = document.getElementById('input-host') as HTMLInputElement
  const inputToken = document.getElementById('input-token') as HTMLInputElement

  function openModal(): void {
    addModal.classList.remove('hidden')
    inputHost.focus()
  }

  function closeModal(): void {
    addModal.classList.add('hidden')
    inputHost.value = ''
    inputToken.value = ''
  }

  btnAdd.addEventListener('click', openModal)
  btnAddFirst?.addEventListener('click', openModal)
  btnCancel.addEventListener('click', closeModal)

  btnConfirm.addEventListener('click', () => {
    const address = inputHost.value.trim()
    const token = inputToken.value.trim()

    if (!address || !token) return

    addHost({ name: address, address, token })
    closeModal()
    renderHosts()
  })

  // Close modal on backdrop click
  addModal.addEventListener('click', (e) => {
    if (e.target === addModal) closeModal()
  })

  // Footer nav
  const navHosts = document.getElementById('nav-hosts')!
  const navSettings = document.getElementById('nav-settings-btn')!

  navHosts.addEventListener('click', () => {
    settingsPanel.classList.add('hidden')
    navHosts.classList.add('active')
    navSettings.classList.remove('active')
  })

  navSettings.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden')
    navHosts.classList.remove('active')
    navSettings.classList.add('active')
    initSettings()
  })
}

function initSettings(): void {
  const themeSelect = document.getElementById('theme-select') as HTMLSelectElement
  const pinToggle = document.getElementById('pin-toggle') as HTMLInputElement
  const pinSetRow = document.getElementById('pin-set-row')!

  // Load saved theme
  const savedTheme = localStorage.getItem('warren:theme') ?? 'tokyo-night'
  themeSelect.value = savedTheme

  themeSelect.addEventListener('change', () => {
    localStorage.setItem('warren:theme', themeSelect.value)
    // TODO: Apply theme to active terminal if open
  })

  // PIN toggle
  const hasPin = localStorage.getItem('warren:pin') !== null
  pinToggle.checked = hasPin
  pinSetRow.classList.toggle('hidden', !hasPin)

  pinToggle.addEventListener('change', () => {
    if (pinToggle.checked) {
      // TODO: Prompt to set a PIN
      alert('PIN setup coming soon')
      pinToggle.checked = false
    } else {
      localStorage.removeItem('warren:pin')
      pinSetRow.classList.add('hidden')
    }
  })
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function timeSince(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
