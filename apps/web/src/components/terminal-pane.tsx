import { useEffect, useRef } from 'react'
import 'xterm/css/xterm.css'
import type { SessionState } from '@/lib/terminal-store'
import { resizeActiveSession } from '@/lib/terminal-store'

interface Props {
  sessionState: SessionState
  isActive: boolean
}

export function TerminalPane({ sessionState, isActive }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mounted = useRef(false)

  // Open terminal into DOM on first render
  useEffect(() => {
    const el = containerRef.current
    if (!el || mounted.current) return

    sessionState.terminal.open(el)
    sessionState.fitAddon.fit()
    mounted.current = true

    return () => {
      // Terminal disposal is handled by the store
      mounted.current = false
    }
  }, [sessionState])

  // Fit + focus when activated
  useEffect(() => {
    if (!isActive || !mounted.current) return

    // Small delay to ensure the pane is visible before fitting
    const timer = setTimeout(() => {
      sessionState.fitAddon.fit()
      sessionState.terminal.focus()
      resizeActiveSession(sessionState.terminal.cols, sessionState.terminal.rows)
    }, 10)

    return () => clearTimeout(timer)
  }, [isActive, sessionState])

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      if (!isActive) return
      sessionState.fitAddon.fit()
      resizeActiveSession(sessionState.terminal.cols, sessionState.terminal.rows)
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [isActive, sessionState])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ display: isActive ? 'block' : 'none' }}
    />
  )
}
