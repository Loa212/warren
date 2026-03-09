import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useSyncExternalStore, useEffect, useRef, useCallback } from 'react'
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

export const Route = createFileRoute('/terminal')({
  component: TerminalPage,
})

function TerminalPage() {
  const navigate = useNavigate()
  const { sessions, activeSessionId } = useSyncExternalStore(subscribe, getSnapshot)
  const sessionList = [...sessions.entries()]

  // If no sessions, go back to hosts
  useEffect(() => {
    if (sessionList.length === 0) {
      navigate({ to: '/' })
    }
  }, [sessionList.length, navigate])

  const handleBack = useCallback(() => {
    navigate({ to: '/' })
  }, [navigate])

  return (
    <div className="fixed inset-0 flex flex-col bg-black">
      {/* Tab bar */}
      <div className="flex bg-bg border-b border-border overflow-x-auto shrink-0 pt-[env(safe-area-inset-top)] scrollbar-none">
        {sessionList.map(([id, state]) => {
          const hostShort = state.host.split(':')[0]
          const shellName = state.session.shell.split('/').pop() ?? 'shell'

          return (
            <div
              key={id}
              onClick={() => activateSession(id)}
              className={`shrink-0 px-4 py-2.5 text-[13px] cursor-pointer border-b-2 whitespace-nowrap flex items-center gap-2 min-w-[80px] justify-center transition-colors ${
                id === activeSessionId
                  ? 'text-accent border-accent'
                  : 'text-muted border-transparent'
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

        {/* New tab button */}
        <button
          onClick={() => createSession()}
          className="shrink-0 px-3.5 py-2.5 text-muted text-lg hover:text-accent transition-colors"
          title="New session on current host"
        >
          +
        </button>
      </div>

      {/* Terminal panes */}
      <div className="relative flex-1 overflow-hidden">
        {sessionList.map(([id, state]) => (
          <TerminalPane
            key={id}
            sessionState={state}
            isActive={id === activeSessionId}
          />
        ))}
      </div>

      {/* Touch toolbar */}
      <Toolbar onBack={handleBack} onSend={sendData} />
    </div>
  )
}
