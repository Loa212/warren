import { sha256 } from '@noble/hashes/sha2.js'
import { useEffect, useRef, useSyncExternalStore } from 'react'

const PIN_HASH_KEY = 'warren:pin'
const PIN_TIMEOUT_KEY = 'warren:pin:timeout'
const DEFAULT_TIMEOUT_MINUTES = 5

// ---------------------------------------------------------------------------
// PIN storage helpers
// ---------------------------------------------------------------------------

function hashPin(pin: string): string {
  const bytes = sha256(new TextEncoder().encode(pin))
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function isPinSet(): boolean {
  return !!localStorage.getItem(PIN_HASH_KEY)
}

export function setPin(pin: string): void {
  localStorage.setItem(PIN_HASH_KEY, hashPin(pin))
}

export function verifyPin(pin: string): boolean {
  const stored = localStorage.getItem(PIN_HASH_KEY)
  if (!stored) return false
  return stored === hashPin(pin)
}

export function clearPin(): void {
  localStorage.removeItem(PIN_HASH_KEY)
}

export function getPinTimeout(): number {
  const v = localStorage.getItem(PIN_TIMEOUT_KEY)
  return v ? parseInt(v, 10) : DEFAULT_TIMEOUT_MINUTES
}

export function setPinTimeout(minutes: number): void {
  localStorage.setItem(PIN_TIMEOUT_KEY, String(minutes))
}

// ---------------------------------------------------------------------------
// Lock state — module-level, resets on page load (intentional)
// ---------------------------------------------------------------------------

type Listener = () => void
let locked = isPinSet() // locked on fresh load if PIN is configured
const listeners = new Set<Listener>()

function notify() {
  for (const l of listeners) l()
}

export function isLocked(): boolean {
  return locked
}

export function lock(): void {
  if (isPinSet() && !locked) {
    locked = true
    notify()
  }
}

export function unlock(): void {
  if (locked) {
    locked = false
    notify()
  }
}

function subscribe(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

function getSnapshot(): boolean {
  return locked
}

// ---------------------------------------------------------------------------
// usePinLock hook
// ---------------------------------------------------------------------------

export function usePinLock() {
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isCurrentlyLocked = useSyncExternalStore(subscribe, getSnapshot)

  useEffect(() => {
    if (!isPinSet()) return

    function resetTimer() {
      if (inactivityRef.current) clearTimeout(inactivityRef.current)
      inactivityRef.current = setTimeout(() => lock(), getPinTimeout() * 60 * 1000)
    }

    function handleVisibility() {
      if (document.hidden) lock()
    }

    const events = ['pointermove', 'keydown', 'touchstart'] as const
    for (const e of events) document.addEventListener(e, resetTimer, { passive: true })
    document.addEventListener('visibilitychange', handleVisibility)

    // Start the inactivity timer
    resetTimer()

    return () => {
      if (inactivityRef.current) clearTimeout(inactivityRef.current)
      for (const e of events) document.removeEventListener(e, resetTimer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return { isLocked: isCurrentlyLocked, lock, unlock }
}
