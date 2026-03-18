import { useCallback, useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { unlock, verifyPin } from '@/lib/pin-lock'

const PIN_LENGTH = 4
const MAX_ATTEMPTS = 3
const COOLDOWN_SECONDS = 30

export function PinLockScreen() {
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [cooldown, setCooldown] = useState(0)
  const [showForgot, setShowForgot] = useState(false)
  const [showConfirmWipe, setShowConfirmWipe] = useState(false)

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  // Reset error shake after animation
  useEffect(() => {
    if (!error) return
    const id = setTimeout(() => setError(false), 600)
    return () => clearTimeout(id)
  }, [error])

  const submit = useCallback(
    (pin: string) => {
      if (verifyPin(pin)) {
        unlock()
      } else {
        const next = attempts + 1
        setAttempts(next)
        setDigits([])
        setError(true)
        if (next >= MAX_ATTEMPTS) {
          setCooldown(COOLDOWN_SECONDS)
          setAttempts(0)
        }
      }
    },
    [attempts],
  )

  function pressDigit(d: string) {
    if (cooldown > 0) return
    setDigits((prev) => {
      if (prev.length >= PIN_LENGTH) return prev
      const next = [...prev, d]
      if (next.length === PIN_LENGTH) {
        // Submit on completion
        setTimeout(() => submit(next.join('')), 80)
      }
      return next
    })
  }

  function pressDelete() {
    setDigits((prev) => prev.slice(0, -1))
  }

  function wipeAllData() {
    localStorage.clear()
    sessionStorage.clear()
    location.reload()
  }

  const locked = cooldown > 0

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0c0b15] select-none">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-2">🐇</div>
        <p className="text-sm font-semibold text-[#b794f4] tracking-widest uppercase">Warren</p>
      </div>

      {/* PIN dots */}
      <div
        className="flex gap-4 mb-6"
        style={{ animation: error ? 'pin-shake 0.5s ease' : undefined }}
      >
        {(['a', 'b', 'c', 'd'] as const).map((id, i) => (
          <div
            key={id}
            className="w-3.5 h-3.5 rounded-full border-2 transition-all duration-100"
            style={{
              background: i < digits.length ? '#b794f4' : 'transparent',
              borderColor: error ? '#f28b82' : '#b794f4',
            }}
          />
        ))}
      </div>

      {/* Status message */}
      <div className="h-5 mb-6 text-sm text-center">
        {locked ? (
          <span className="text-[#f28b82]">Too many attempts. Try again in {cooldown}s</span>
        ) : error ? (
          <span className="text-[#f28b82]">Incorrect PIN</span>
        ) : attempts > 0 ? (
          <span className="text-[#f28b82]/70">
            {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining
          </span>
        ) : null}
      </div>

      {/* Numeric keypad */}
      <div className="grid grid-cols-3 gap-3 w-64">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <KeypadButton key={d} label={d} onPress={() => pressDigit(d)} disabled={locked} />
        ))}
        {/* Empty slot, 0, delete */}
        <div />
        <KeypadButton label="0" onPress={() => pressDigit('0')} disabled={locked} />
        <KeypadButton label="⌫" onPress={pressDelete} disabled={locked || digits.length === 0} />
      </div>

      {/* Forgot PIN */}
      <button
        type="button"
        onClick={() => setShowForgot(true)}
        className="mt-10 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        Forgot PIN?
      </button>

      {/* Forgot PIN info dialog */}
      <Dialog open={showForgot} onOpenChange={setShowForgot}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Forgot your PIN?</DialogTitle>
          <DialogDescription className="text-sm">
            The only way to recover is to wipe all Warren data — saved hosts, settings, and pairing
            info will be permanently deleted.
          </DialogDescription>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="flex-1 py-2 rounded-lg border border-border text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForgot(false)
                setShowConfirmWipe(true)
              }}
              className="flex-1 py-2 rounded-lg bg-destructive text-white text-sm font-semibold"
            >
              Wipe data
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Final confirmation dialog */}
      <Dialog open={showConfirmWipe} onOpenChange={setShowConfirmWipe}>
        <DialogContent className="max-w-sm">
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription className="text-sm">
            This will permanently delete all Warren data. You'll need to re-pair all your devices.
          </DialogDescription>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => setShowConfirmWipe(false)}
              className="flex-1 py-2 rounded-lg border border-border text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={wipeAllData}
              className="flex-1 py-2 rounded-lg bg-destructive text-white text-sm font-semibold"
            >
              Delete everything
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes pin-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  )
}

function KeypadButton({
  label,
  onPress,
  disabled,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      className="h-16 rounded-2xl text-xl font-medium transition-all active:scale-95 disabled:opacity-30"
      style={{
        background: 'rgba(183,148,244,0.08)',
        color: '#e2d9f3',
      }}
    >
      {label}
    </button>
  )
}
