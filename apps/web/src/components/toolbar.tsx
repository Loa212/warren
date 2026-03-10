import { useCallback, useState } from 'react'

interface Props {
  onSend: (data: string) => void
}

const ESCAPE_SEQUENCES: Record<string, string> = {
  esc: '\x1b',
  tab: '\t',
  up: '\x1b[A',
  down: '\x1b[B',
  right: '\x1b[C',
  left: '\x1b[D',
  pipe: '|',
}

const KEYS = [
  { action: 'esc', label: 'Esc' },
  { action: 'ctrl', label: 'Ctrl' },
  { action: 'alt', label: 'Alt' },
  { action: 'tab', label: 'Tab' },
  { action: 'up', label: '↑' },
  { action: 'down', label: '↓' },
  { action: 'left', label: '←' },
  { action: 'right', label: '→' },
  { action: 'pipe', label: '|' },
]

const btnBase =
  'shrink-0 min-w-[44px] h-11 rounded-md text-[13px] flex items-center justify-center my-1 mx-0.5 px-2 whitespace-nowrap transition-colors border'
const btnNormal = `${btnBase} bg-secondary border-border text-foreground active:bg-muted active:text-primary`
const btnActive = `${btnBase} bg-primary text-primary-foreground border-primary`

export function Toolbar({ onSend }: Props) {
  const [ctrlActive, setCtrlActive] = useState(false)
  const [altActive, setAltActive] = useState(false)

  const handleAction = useCallback(
    (action: string) => {
      if (action === 'ctrl') {
        setCtrlActive((v) => !v)
        return
      }
      if (action === 'alt') {
        setAltActive((v) => !v)
        return
      }

      let sequence = ESCAPE_SEQUENCES[action] ?? action

      if (ctrlActive && sequence.length === 1) {
        const code = sequence.toUpperCase().charCodeAt(0) - 64
        if (code >= 1 && code <= 26) {
          sequence = String.fromCharCode(code)
        }
        setCtrlActive(false)
      } else if (altActive) {
        sequence = `\x1b${sequence}`
        setAltActive(false)
      }

      onSend(sequence)
    },
    [ctrlActive, altActive, onSend],
  )

  return (
    <div className="flex bg-background border-t overflow-x-auto shrink-0 pb-[env(safe-area-inset-bottom)] gap-0.5 px-1 scrollbar-none">
      {KEYS.map(({ action, label }) => {
        const isModifier = action === 'ctrl' || action === 'alt'
        const isActive = (action === 'ctrl' && ctrlActive) || (action === 'alt' && altActive)

        return (
          <button
            type="button"
            key={action}
            onClick={() => handleAction(action)}
            onTouchEnd={(e) => e.preventDefault()}
            className={isModifier && isActive ? btnActive : btnNormal}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
