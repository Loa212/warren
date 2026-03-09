// Touch toolbar — floating key buttons for mobile terminal use
// Sends appropriate escape sequences via the terminal's data channel

import { sendToTerminal } from './terminal'

// Ctrl key sticky-modifier state
let ctrlActive = false
let altActive = false

const ESCAPE_SEQUENCES: Record<string, string> = {
  esc: '\x1b',
  tab: '\t',
  up: '\x1b[A',
  down: '\x1b[B',
  right: '\x1b[C',
  left: '\x1b[D',
  pipe: '|',
}

export function initToolbar(): void {
  const toolbar = document.getElementById('touch-toolbar')!
  const buttons = toolbar.querySelectorAll<HTMLButtonElement>('.tool-btn')

  for (const btn of buttons) {
    btn.addEventListener('click', () => handleToolbarAction(btn))
    // Prevent double-tap zoom on mobile
    btn.addEventListener('touchend', (e: TouchEvent) => e.preventDefault())
  }
}

function handleToolbarAction(btn: HTMLButtonElement): void {
  const action = btn.dataset.action
  if (!action) return

  if (action === 'back') {
    // Navigate back to config screen
    window.dispatchEvent(new CustomEvent('warren:navigate', { detail: 'config' }))
    return
  }

  if (action === 'ctrl') {
    ctrlActive = !ctrlActive
    btn.classList.toggle('active-modifier', ctrlActive)
    return
  }

  if (action === 'alt') {
    altActive = !altActive
    btn.classList.toggle('active-modifier', altActive)
    return
  }

  // Resolve the character/sequence to send
  let sequence = ESCAPE_SEQUENCES[action] ?? action

  if (ctrlActive && sequence.length === 1) {
    // Ctrl+key → ASCII control code
    const code = sequence.toUpperCase().charCodeAt(0) - 64
    if (code >= 1 && code <= 26) {
      sequence = String.fromCharCode(code)
    }
    ctrlActive = false
    updateModifierButtons()
  } else if (altActive) {
    // Alt/Meta → prefix with ESC
    sequence = `\x1b${sequence}`
    altActive = false
    updateModifierButtons()
  }

  sendToTerminal(sequence)
}

function updateModifierButtons(): void {
  const toolbar = document.getElementById('touch-toolbar')!
  const ctrlBtn = toolbar.querySelector<HTMLButtonElement>('[data-action="ctrl"]')
  const altBtn = toolbar.querySelector<HTMLButtonElement>('[data-action="alt"]')
  ctrlBtn?.classList.toggle('active-modifier', ctrlActive)
  altBtn?.classList.toggle('active-modifier', altActive)
}
