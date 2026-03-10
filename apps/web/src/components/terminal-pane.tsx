import { useEffect, useRef, useCallback } from 'react'
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

  // Open terminal into DOM once
  useEffect(() => {
    const el = containerRef.current
    if (!el || mounted.current) return

    // Clear stale children (React StrictMode double-mount)
    el.innerHTML = ''
    sessionState.terminal.open(el)
    mounted.current = true

    requestAnimationFrame(() => {
      sessionState.fitAddon.fit()
      if (isActive) sessionState.terminal.focus()
    })

    return () => {
      mounted.current = false
    }
  }, [sessionState])

  // Focus + fit when this pane becomes active
  useEffect(() => {
    if (!isActive || !mounted.current) return

    const timer = setTimeout(() => {
      sessionState.fitAddon.fit()
      sessionState.terminal.focus()
      resizeActiveSession(sessionState.terminal.cols, sessionState.terminal.rows)
    }, 50)

    return () => clearTimeout(timer)
  }, [isActive, sessionState])

  // Re-focus terminal on click (e.g. after toolbar steals focus)
  const handleClick = useCallback(() => {
    if (isActive) sessionState.terminal.focus()
  }, [isActive, sessionState])

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const observer = new ResizeObserver(() => {
      if (!isActive || !mounted.current) return
      sessionState.fitAddon.fit()
      resizeActiveSession(sessionState.terminal.cols, sessionState.terminal.rows)
    })

    observer.observe(el)
    return () => observer.disconnect()
  }, [isActive, sessionState])

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      className="absolute inset-0"
      style={{ display: isActive ? 'block' : 'none' }}
    />
  )
}
