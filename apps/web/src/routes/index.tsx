import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getHosts, addHost, removeHost, updateHostLastConnected } from '@/lib/connection'
import type { SavedHost } from '@/lib/connection'
import { connectToHost } from '@/lib/terminal-store'

export const Route = createFileRoute('/')({
  component: HostsPage,
})

function HostsPage() {
  const navigate = useNavigate()
  const [hosts, setHosts] = useState<SavedHost[]>(getHosts)
  const [showModal, setShowModal] = useState(false)
  const [address, setAddress] = useState('')
  const [token, setToken] = useState('')

  function refresh() {
    setHosts(getHosts())
  }

  function handleConnect(host: SavedHost) {
    updateHostLastConnected(host.id)
    connectToHost(host.address, host.token)
    navigate({ to: '/terminal' })
  }

  function handleAdd() {
    if (!address.trim() || !token.trim()) return
    addHost({ name: address.trim(), address: address.trim(), token: token.trim() })
    setAddress('')
    setToken('')
    setShowModal(false)
    refresh()
  }

  function handleRemove(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    removeHost(id)
    refresh()
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-4 border-b border-border">
        <h1 className="text-lg font-bold tracking-widest text-accent">Warren</h1>
        <button
          onClick={() => setShowModal(true)}
          className="w-9 h-9 bg-bg3 rounded-lg text-text text-xl flex items-center justify-center hover:bg-accent-dim transition-colors"
        >
          +
        </button>
      </header>

      {/* Host list */}
      <div className="flex-1 overflow-y-auto p-4">
        {hosts.length === 0 ? (
          <div className="text-center pt-16 text-muted">
            <pre className="text-3xl mb-4 font-mono">{'(\\(\\\n( -.-))'}</pre>
            <p className="mb-5 text-sm">No hosts yet</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-accent text-bg font-semibold rounded-lg px-6 py-3 text-sm"
            >
              Add a Host
            </button>
          </div>
        ) : (
          hosts.map((host) => (
            <div
              key={host.id}
              onClick={() => handleConnect(host)}
              className="bg-bg2 border border-border rounded-xl p-4 mb-3 cursor-pointer flex items-center justify-between active:bg-bg3 transition-colors"
            >
              <div>
                <h3 className="text-[15px] font-semibold text-text">{host.name || host.address}</h3>
                <p className="text-xs text-muted mt-1">
                  {host.address}
                  {host.lastConnected && ` · ${timeSince(host.lastConnected)}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-muted" />
                <button
                  onClick={(e) => handleRemove(e, host.id)}
                  className="text-muted hover:text-red text-xs px-2 py-1"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer nav */}
      <footer className="flex border-t border-border pb-[env(safe-area-inset-bottom)]">
        <button className="flex-1 py-3.5 text-[13px] text-accent">Hosts</button>
        <button
          onClick={() => navigate({ to: '/settings' })}
          className="flex-1 py-3.5 text-[13px] text-muted hover:text-text transition-colors"
        >
          Settings
        </button>
      </footer>

      {/* Add host modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-end z-50"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-bg2 border-t border-border rounded-t-2xl p-6 pb-[calc(24px+env(safe-area-inset-bottom))] w-full">
            <h2 className="text-[17px] font-semibold mb-5">Add Host</h2>

            <div className="mb-4">
              <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">
                Host address
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="192.168.1.100:9470"
                className="w-full bg-bg3 border border-border rounded-lg px-3 py-3 text-text text-[15px] outline-none focus:border-accent-dim"
              />
            </div>

            <div className="mb-4">
              <label className="block text-xs text-muted uppercase tracking-wider mb-1.5">
                Token
              </label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from host"
                className="w-full bg-bg3 border border-border rounded-lg px-3 py-3 text-text text-[15px] outline-none focus:border-accent-dim"
              />
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-bg3 border border-border text-text rounded-lg py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 bg-accent text-bg font-semibold rounded-lg py-2.5 text-sm"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function timeSince(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}
