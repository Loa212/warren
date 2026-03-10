import { createFileRoute, redirect } from '@tanstack/react-router'
import { addHost, getHosts, updateHostLastConnected } from '@/lib/connection'
import { connectToHost } from '@/lib/terminal-store'

export const Route = createFileRoute('/connect')({
  validateSearch: (search: Record<string, unknown>) => ({
    host: (search.host as string) ?? '',
    token: (search.token as string) ?? '',
  }),
  beforeLoad: ({ search }) => {
    const { host, token } = search
    if (!host || !token) throw redirect({ to: '/' })

    // Reuse existing saved host if address matches, otherwise create one
    const existing = getHosts().find((h) => h.address === host)
    let hostId: string

    if (existing) {
      hostId = existing.id
      updateHostLastConnected(existing.id)
    } else {
      const saved = addHost({ name: host, address: host, token })
      hostId = saved.id
    }

    connectToHost(host, token)
    throw redirect({ to: '/$hostId/terminal', params: { hostId } })
  },
  component: () => null,
})
