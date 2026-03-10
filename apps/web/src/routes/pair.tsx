import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import type { WsMessage } from '@warren/types'
import { useEffect, useState } from 'react'
import { addHost, getHosts, updateHost } from '@/lib/connection'
import { deriveSharedSecretB64, generateEphemeralKeyPair } from '@/lib/pairing'
import { connectToHost } from '@/lib/terminal-store'
import { WarrenWsClient } from '@/lib/ws-client'

export const Route = createFileRoute('/pair')({
  validateSearch: (search: Record<string, unknown>) => ({
    host: (search.host as string) ?? '',
    nonce: (search.nonce as string) ?? '',
    publicKey: (search.publicKey as string) ?? '',
    pin: (search.pin as string) ?? '',
  }),
  beforeLoad: ({ search }) => {
    if (!search.host || !search.nonce || !search.publicKey) {
      throw redirect({ to: '/' })
    }
  },
  component: PairPage,
})

type PairStatus = 'connecting' | 'success' | 'error'

function PairPage() {
  const { host, nonce, pin } = Route.useSearch()
  const navigate = useNavigate()
  const [status, setStatus] = useState<PairStatus>('connecting')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const kp = generateEphemeralKeyPair()
    const ws = new WarrenWsClient(`ws://${host}/ws?pair=true`)
    let done = false

    const unsub = ws.onMessage((msg: WsMessage) => {
      if (done) return

      if (msg.type === 'pair:accept') {
        done = true
        const sharedSecret = deriveSharedSecretB64(kp.privateKey, msg.publicKey)
        const deviceId = msg.deviceId

        const existing = getHosts().find((h) => h.address === host)
        let hostId: string
        if (existing) {
          updateHost(existing.id, {
            publicKey: msg.publicKey,
            sharedSecret,
            authVersion: 'v2',
            deviceId,
          })
          hostId = existing.id
        } else {
          const saved = addHost({
            name: host,
            address: host,
            token: '',
            publicKey: msg.publicKey,
            sharedSecret,
            authVersion: 'v2',
            deviceId,
          })
          hostId = saved.id
        }

        ws.disconnect()
        const savedHost = getHosts().find((h) => h.id === hostId)
        if (savedHost) connectToHost(host, '', savedHost)
        setStatus('success')
        navigate({ to: '/$hostId/terminal', params: { hostId } })
      } else if (msg.type === 'pair:reject') {
        done = true
        setStatus('error')
        setErrorMsg(msg.reason ?? 'Pairing rejected')
        ws.disconnect()
      }
    })

    ws.onOpen(() => {
      ws.send({ type: 'pair:request', publicKey: kp.publicKeyB64, nonceSig: nonce })
    })

    ws.connect()

    return () => {
      unsub()
      if (!done) ws.disconnect()
    }
  }, [host, nonce, navigate])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-8 text-center">
      {status === 'connecting' && (
        <>
          <div className="text-4xl mb-6 animate-pulse">🐇</div>
          <h1 className="text-lg font-semibold text-foreground mb-2">Pairing…</h1>
          <p className="text-sm text-muted-foreground mb-4">Exchanging keys with {host}</p>
          {pin && (
            <div className="bg-secondary rounded-xl px-6 py-4 text-center">
              <p className="text-xs text-muted-foreground mb-1 uppercase tracking-widest">PIN</p>
              <p className="text-3xl font-mono font-bold text-primary tracking-widest">{pin}</p>
              <p className="text-xs text-muted-foreground mt-1">Verify this matches your desktop</p>
            </div>
          )}
        </>
      )}
      {status === 'success' && (
        <>
          <div className="text-4xl mb-6">✓</div>
          <h1 className="text-lg font-semibold text-foreground">Paired!</h1>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="text-4xl mb-6">✕</div>
          <h1 className="text-lg font-semibold text-destructive mb-2">Pairing failed</h1>
          <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
          <a href="/" className="text-primary underline text-sm">
            Back to hosts
          </a>
        </>
      )}
    </div>
  )
}
