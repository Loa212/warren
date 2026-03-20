import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { clearPin, getPinTimeout, isPinSet, setPin, setPinTimeout, verifyPin } from '@/lib/pin-lock'
import { getAllTerminals } from '@/lib/terminal-store'
import { applyThemeEverywhere, getTheme, listAvailableThemes } from '@/lib/theme'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const themes = listAvailableThemes()
  const [active, setActive] = useState(localStorage.getItem('warren:theme') ?? 'tokyo-night')

  function handleThemeChange(name: string) {
    setActive(name)
    applyThemeEverywhere(name, getAllTerminals())
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="flex items-center gap-4 px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-4 border-b">
        <Link to="/" className="text-muted-foreground hover:text-foreground text-xl leading-none">
          ←
        </Link>
        <h1 className="text-lg font-bold">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        <section>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Theme
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {themes.map((name) => (
              <ThemeCard
                key={name}
                name={name}
                isActive={name === active}
                onSelect={handleThemeChange}
              />
            ))}
          </div>
        </section>

        <PinSection />

        <div className="text-center text-xs text-muted-foreground/40 pt-4">Warren v0.1.0 · MIT</div>
      </div>

      <footer className="flex border-t pb-[env(safe-area-inset-bottom)]">
        <Link
          to="/"
          className="flex-1 py-3.5 text-[13px] text-muted-foreground text-center hover:text-foreground transition-colors"
        >
          Hosts
        </Link>
        <span className="flex-1 py-3.5 text-[13px] text-primary text-center">Settings</span>
      </footer>
    </div>
  )
}

function ThemeCard({
  name,
  isActive,
  onSelect,
}: {
  name: string
  isActive: boolean
  onSelect: (name: string) => void
}) {
  const theme = getTheme(name)
  const bg = theme.colors.background
  const fg = theme.colors.foreground
  const accent = theme.ui?.accent ?? theme.colors.blue
  const border = theme.ui?.border ?? '#333'
  const tabBar = theme.ui?.tabBar ?? bg

  return (
    <button
      type="button"
      onClick={() => onSelect(name)}
      className="relative rounded-xl overflow-hidden text-left transition-all"
      style={{
        outline: isActive ? `2px solid ${accent}` : '2px solid transparent',
        outlineOffset: '2px',
      }}
    >
      {/* Mini terminal preview */}
      <div style={{ background: bg }}>
        {/* Tab bar */}
        <div
          className="flex items-center gap-1 px-2 py-1.5"
          style={{ background: tabBar, borderBottom: `1px solid ${border}` }}
        >
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.colors.red }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.colors.yellow }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: theme.colors.green }} />
        </div>

        {/* Fake terminal lines */}
        <div className="px-3 py-2 space-y-1 font-mono" style={{ fontSize: '9px' }}>
          <div>
            <span style={{ color: accent }}>~</span>
            <span style={{ color: fg }}> $ ls</span>
          </div>
          <div style={{ color: fg, opacity: 0.65 }}>Documents Downloads</div>
          <div>
            <span style={{ color: accent }}>~</span>
            <span style={{ color: fg }}> $ </span>
            <span
              className="inline-block w-1.5 h-3 align-middle"
              style={{ background: theme.colors.cursor, opacity: 0.85 }}
            />
          </div>
        </div>
      </div>

      {/* Label */}
      <div
        className="px-3 py-2 text-[11px] font-medium"
        style={{ background: tabBar, color: fg, borderTop: `1px solid ${border}` }}
      >
        {theme.name}
      </div>

      {/* Active indicator */}
      {isActive && (
        <div
          className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
          style={{ background: accent, color: contrastColor(accent) }}
        >
          ✓
        </div>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// PIN Security Section
// ---------------------------------------------------------------------------

const TIMEOUT_OPTIONS = [1, 5, 10, 30, 60] as const

type PinFlow =
  | 'idle'
  | 'set-new'
  | 'confirm-new'
  | 'verify-current'
  | 'change-new'
  | 'confirm-change'
  | 'remove-verify'

function PinSection() {
  const [pinEnabled, setPinEnabled] = useState(isPinSet)
  const [flow, setFlow] = useState<PinFlow>('idle')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (flow !== 'idle') inputRef.current?.focus()
  }, [flow])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const [timeout, setTimeout_] = useState(getPinTimeout)

  function reset() {
    setFlow('idle')
    setInput('')
    setPending('')
    setError('')
  }

  function handleToggle() {
    if (pinEnabled) {
      setFlow('remove-verify')
      setInput('')
      setError('')
    } else {
      setFlow('set-new')
      setInput('')
      setError('')
    }
  }

  function handleSubmit() {
    if (flow === 'set-new') {
      if (input.length < 4) {
        setError('PIN must be 4–6 digits')
        return
      }
      setPending(input)
      setInput('')
      setError('')
      setFlow('confirm-new')
    } else if (flow === 'confirm-new') {
      if (input !== pending) {
        setError("PINs don't match")
        setInput('')
        return
      }
      setPin(input)
      setPinEnabled(true)
      reset()
    } else if (flow === 'verify-current') {
      if (!verifyPin(input)) {
        setError('Incorrect PIN')
        setInput('')
        return
      }
      setInput('')
      setError('')
      setFlow('change-new')
    } else if (flow === 'change-new') {
      if (input.length < 4) {
        setError('PIN must be 4–6 digits')
        return
      }
      setPending(input)
      setInput('')
      setError('')
      setFlow('confirm-change')
    } else if (flow === 'confirm-change') {
      if (input !== pending) {
        setError("PINs don't match")
        setInput('')
        return
      }
      setPin(input)
      reset()
    } else if (flow === 'remove-verify') {
      if (!verifyPin(input)) {
        setError('Incorrect PIN')
        setInput('')
        return
      }
      clearPin()
      setPinEnabled(false)
      reset()
    }
  }

  function handleTimeoutChange(minutes: number) {
    setTimeout_(minutes)
    setPinTimeout(minutes)
  }

  const flowLabel: Record<PinFlow, string> = {
    idle: '',
    'set-new': 'Enter new PIN (4–6 digits)',
    'confirm-new': 'Confirm new PIN',
    'verify-current': 'Enter current PIN',
    'change-new': 'Enter new PIN (4–6 digits)',
    'confirm-change': 'Confirm new PIN',
    'remove-verify': 'Enter current PIN to disable',
  }

  return (
    <section>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
        Security
      </p>

      <div className="rounded-xl border border-border overflow-hidden">
        {/* PIN toggle row */}
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-medium">PIN Lock</p>
            <p className="text-xs text-muted-foreground">Require PIN to open the app</p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className="relative inline-flex w-11 h-6 rounded-full transition-colors shrink-0"
            style={{ background: pinEnabled ? '#b794f4' : '#333' }}
            aria-label={pinEnabled ? 'Disable PIN' : 'Enable PIN'}
          >
            <span
              className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200"
              style={{ transform: pinEnabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* PIN flow input */}
        {flow !== 'idle' && (
          <div className="px-4 pb-3 border-t border-border pt-3 space-y-2">
            <p className="text-xs text-muted-foreground">{flowLabel[flow]}</p>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={input}
                onChange={(e) => setInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                placeholder="••••"
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-primary"
              />
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg bg-primary text-background text-sm font-semibold"
              >
                OK
              </button>
              <button
                type="button"
                onClick={reset}
                className="px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground"
              >
                ✕
              </button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        )}

        {/* Change PIN (only when enabled and idle) */}
        {pinEnabled && flow === 'idle' && (
          <div className="px-4 py-2.5 border-t border-border">
            <button
              type="button"
              onClick={() => {
                setFlow('verify-current')
                setInput('')
                setError('')
              }}
              className="text-sm text-primary hover:underline"
            >
              Change PIN
            </button>
          </div>
        )}

        {/* Auto-lock timeout */}
        {pinEnabled && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">Auto-lock after</p>
            <select
              value={timeout}
              onChange={(e) => handleTimeoutChange(Number(e.target.value))}
              className="bg-background border border-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-primary"
            >
              {TIMEOUT_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m === 1 ? '1 min' : `${m} mins`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </section>
  )
}

function contrastColor(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.4 ? '#0a0a0a' : '#ffffff'
}
