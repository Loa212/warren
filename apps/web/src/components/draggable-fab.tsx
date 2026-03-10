import { useState, useRef, useCallback, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  menuContent?: ReactNode
  menuOpen?: boolean
  onToggleMenu?: () => void
  className?: string
}

const DRAG_THRESHOLD = 6

export function DraggableFab({ children, menuContent, menuOpen, onToggleMenu, className }: Props) {
  const [pos, setPos] = useState({ x: 16, y: 80 }) // offset from bottom-right
  const dragging = useRef(false)
  const wasDragged = useRef(false)
  const start = useRef({ x: 0, y: 0, posX: 0, posY: 0 })

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true
      wasDragged.current = false
      start.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [pos],
  )

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return

    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y

    if (!wasDragged.current && Math.abs(dx) + Math.abs(dy) < DRAG_THRESHOLD) return
    wasDragged.current = true

    const newX = Math.max(0, Math.min(window.innerWidth - 56, start.current.posX - dx))
    const newY = Math.max(0, Math.min(window.innerHeight - 56, start.current.posY + dy))

    setPos({ x: newX, y: newY })
  }, [])

  const handlePointerUp = useCallback(() => {
    dragging.current = false
    if (!wasDragged.current) {
      onToggleMenu?.()
    }
  }, [onToggleMenu])

  return (
    <div
      className="fixed z-50"
      style={{ right: pos.x, bottom: pos.y }}
    >
      {menuOpen && menuContent && (
        <div className="mb-2 flex flex-col gap-1.5 items-end">
          {menuContent}
        </div>
      )}
      <button
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center text-lg transition-colors touch-none select-none ${className ?? 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
      >
        {children}
      </button>
    </div>
  )
}
