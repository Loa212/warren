// Session tab bar management

import type { TerminalSession } from '@warren/types'

interface Tab {
  session: TerminalSession
  element: HTMLElement
}

const tabs = new Map<string, Tab>()

export function addSession(session: TerminalSession, onActivate: (id: string) => void): void {
  const tabBar = document.getElementById('session-tabs')!

  const tab = document.createElement('div')
  tab.className = 'session-tab active'
  tab.dataset.sessionId = session.id

  const label = document.createElement('span')
  label.textContent = session.shell.split('/').pop() ?? 'shell'

  const closeBtn = document.createElement('span')
  closeBtn.className = 'tab-close'
  closeBtn.textContent = '×'
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    removeSession(session.id)
  })

  tab.appendChild(label)
  tab.appendChild(closeBtn)

  tab.addEventListener('click', () => {
    setActiveSession(session.id)
    onActivate(session.id)
  })

  // Deactivate other tabs
  for (const t of tabs.values()) {
    t.element.classList.remove('active')
  }

  tabBar.appendChild(tab)
  tabs.set(session.id, { session, element: tab })
}

export function removeSession(sessionId: string): void {
  const tab = tabs.get(sessionId)
  if (tab) {
    tab.element.remove()
    tabs.delete(sessionId)
  }
}

export function setActiveSession(sessionId: string): void {
  for (const [id, tab] of tabs) {
    tab.element.classList.toggle('active', id === sessionId)
  }
}
