import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { listAvailableThemes } from '@/lib/theme'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const navigate = useNavigate()
  const themes = listAvailableThemes()
  const [theme, setTheme] = useState(localStorage.getItem('warren:theme') ?? 'tokyo-night')

  function handleThemeChange(value: string) {
    setTheme(value)
    localStorage.setItem('warren:theme', value)
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-bg">
      {/* Header */}
      <header className="flex items-center gap-4 px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-4 border-b border-border">
        <button
          onClick={() => navigate({ to: '/' })}
          className="text-muted hover:text-text text-xl"
        >
          ←
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pt-4">
        {/* Theme */}
        <div className="flex items-center justify-between py-3.5 border-b border-border">
          <span className="text-[15px]">Theme</span>
          <select
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value)}
            className="bg-bg3 border border-border text-text rounded-md px-2 py-1 text-[13px]"
          >
            {themes.map((t) => (
              <option key={t} value={t}>
                {t.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Version */}
        <div className="mt-8 text-center text-xs text-muted/50">
          Warren v0.1.0 · MIT
        </div>
      </div>

      {/* Footer nav */}
      <footer className="flex border-t border-border pb-[env(safe-area-inset-bottom)]">
        <button
          onClick={() => navigate({ to: '/' })}
          className="flex-1 py-3.5 text-[13px] text-muted hover:text-text transition-colors"
        >
          Hosts
        </button>
        <button className="flex-1 py-3.5 text-[13px] text-accent">Settings</button>
      </footer>
    </div>
  )
}
