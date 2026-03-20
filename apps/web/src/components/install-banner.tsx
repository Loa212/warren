import { useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'warren:install-banner-dismissed'

export function InstallBanner() {
  const [visible, setVisible] = useState(false)
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Already installed as standalone — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return
    // Already dismissed this session
    if (sessionStorage.getItem(DISMISSED_KEY)) return

    const handler = (e: Event) => {
      e.preventDefault()
      promptRef.current = e as BeforeInstallPromptEvent
      setVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  async function install() {
    if (!promptRef.current) return
    await promptRef.current.prompt()
    const { outcome } = await promptRef.current.userChoice
    if (outcome === 'accepted') setVisible(false)
    else dismiss()
  }

  if (!visible) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b border-primary/20 text-sm">
      <span className="text-primary">🐇</span>
      <span className="flex-1 text-foreground/80">Install Warren for offline use</span>
      <button
        type="button"
        onClick={install}
        className="px-3 py-1 rounded-md bg-primary text-background text-xs font-semibold"
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
