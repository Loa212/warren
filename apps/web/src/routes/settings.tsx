import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
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

function contrastColor(hex: string): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.4 ? '#0a0a0a' : '#ffffff'
}
