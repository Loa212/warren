import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import type { SavedHost } from '@/lib/connection'
import { addHost, getHosts, removeHost, updateHostLastConnected } from '@/lib/connection'
import { connectToHost, hasSessionsForHost } from '@/lib/terminal-store'

export const Route = createFileRoute('/')({
  component: HostsPage,
})

function HostsPage() {
  const navigate = useNavigate()
  const [hosts, setHosts] = useState<SavedHost[]>(getHosts)
  const [open, setOpen] = useState(false)
  const [address, setAddress] = useState('')
  const [token, setToken] = useState('')

  function refresh() {
    setHosts(getHosts())
  }

  function handleConnect(host: SavedHost) {
    updateHostLastConnected(host.id)
    if (!hasSessionsForHost(host.address)) {
      connectToHost(host.address, host.token)
    }
    navigate({ to: '/$hostId/terminal', params: { hostId: host.id } })
  }

  function handleAdd() {
    if (!address.trim() || !token.trim()) return
    const host = addHost({ name: address.trim(), address: address.trim(), token: token.trim() })
    setAddress('')
    setToken('')
    setOpen(false)
    connectToHost(host.address, host.token)
    navigate({ to: '/$hostId/terminal', params: { hostId: host.id } })
  }

  function handleRemove(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    removeHost(id)
    refresh()
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-4 border-b">
        <h1 className="text-lg font-bold tracking-widest text-primary">Warren</h1>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" size="icon" className="h-9 w-9 text-xl">
              +
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Add Host</SheetTitle>
            </SheetHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="host-address">Host address</Label>
                <Input
                  id="host-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="192.168.1.100:9470"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="host-token">Token</Label>
                <Input
                  id="host-token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste token from host"
                />
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleAdd}>
                  Connect
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Host list */}
      <div className="flex-1 overflow-y-auto p-4">
        {hosts.length === 0 ? (
          <div className="text-center pt-16 text-muted-foreground">
            <pre className="text-3xl mb-4 font-mono">{'(\\(\\\n( -.-))'}</pre>
            <p className="mb-5 text-sm">No hosts yet</p>
            <Button onClick={() => setOpen(true)}>Add a Host</Button>
          </div>
        ) : (
          hosts.map((host) => (
            <div
              key={host.id}
              role="button"
              tabIndex={0}
              onClick={() => handleConnect(host)}
              onKeyDown={() => handleConnect(host)}
              className="bg-card border rounded-xl p-4 mb-3 cursor-pointer flex items-center justify-between hover:bg-secondary transition-colors"
            >
              <div>
                <h3 className="text-[15px] font-semibold">{host.name || host.address}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {host.address}
                  {host.lastConnected && ` · ${timeSince(host.lastConnected)}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                <button
                  type="button"
                  onClick={(e) => handleRemove(e, host.id)}
                  className="text-muted-foreground hover:text-destructive text-xs px-2 py-1"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer nav */}
      <footer className="flex border-t pb-[env(safe-area-inset-bottom)]">
        <Link to="/" className="flex-1 py-3.5 text-[13px] text-primary text-center">
          Hosts
        </Link>
        <Link
          to="/settings"
          className="flex-1 py-3.5 text-[13px] text-muted-foreground text-center hover:text-foreground transition-colors"
        >
          Settings
        </Link>
      </footer>
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
