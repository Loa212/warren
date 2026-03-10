import { createFileRoute, Link } from '@tanstack/react-router'
import { useSyncExternalStore, useState } from 'react'
import {
  subscribe,
  getSnapshot,
  activateSession,
  killSession,
  createSession,
  sendData,
} from '@/lib/terminal-store'
import { TerminalPane } from '@/components/terminal-pane'
import { Toolbar } from '@/components/toolbar'
import { DraggableFab } from '@/components/draggable-fab'

export const Route = createFileRoute('/$hostId/terminal')({
  component: TerminalPage,
})

function TerminalPage() {
  const { sessions, activeSessionId } = useSyncExternalStore(subscribe, getSnapshot)
  const sessionList = [...sessions.entries()]
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {/* Tab bar */}
      <div className="flex bg-background border-b overflow-x-auto shrink-0 pt-[env(safe-area-inset-top)] scrollbar-none">
        {sessionList.map(([id, state]) => {
          const hostShort = state.host.split(':')[0]
          const shellName = state.session.shell.split('/').pop() ?? 'shell'

          return (
            <div
              key={id}
              onClick={() => activateSession(id)}
              className={`shrink-0 px-4 py-2.5 text-[13px] cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 min-w-[80px] justify-center transition-colors ${
                id === activeSessionId
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent'
              }`}
            >
              <span>{hostShort} › {shellName}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  killSession(id)
                }}
                className="opacity-50 text-[15px] leading-none hover:opacity-100"
              >
                ×
              </span>
            </div>
          )
        })}

        <button
          onClick={() => createSession()}
          className="shrink-0 px-3.5 py-2.5 text-muted-foreground text-lg hover:text-primary transition-colors"
          title="New session"
        >
          +
        </button>
      </div>

      {/* Terminal panes */}
      <div className="relative flex-1 overflow-hidden">
        {sessionList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-3">
            <span>No active sessions</span>
            <Link to="/" className="text-primary underline">
              Back to hosts
            </Link>
          </div>
        ) : (
          sessionList.map(([id, state]) => (
            <TerminalPane
              key={id}
              sessionState={state}
              isActive={id === activeSessionId}
            />
          ))
        )}
      </div>

      {/* Draggable floating menu */}
      <DraggableFab
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((v) => !v)}
        menuContent={
          <>
            <Link
              to="/"
              className="bg-background/90 backdrop-blur border rounded-lg px-3 py-2 text-sm text-foreground shadow-lg hover:bg-secondary transition-colors"
            >
              Hosts
            </Link>
            <Link
              to="/settings"
              className="bg-background/90 backdrop-blur border rounded-lg px-3 py-2 text-sm text-foreground shadow-lg hover:bg-secondary transition-colors"
            >
              Settings
            </Link>
          </>
        }
      >
        {menuOpen ? '×' : '⚙'}
      </DraggableFab>

      {/* Touch toolbar */}
      <Toolbar onSend={sendData} />

      {/* Dismiss menu when tapping elsewhere */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
      )}
    </div>
  )
}
