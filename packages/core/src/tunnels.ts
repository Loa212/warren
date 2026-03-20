// Tunnel provider detection — checks if tunnel binaries are installed and running

import type { TunnelProviderStatus } from '@warren/types'

async function commandExists(cmd: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(['which', cmd], { stdout: 'pipe', stderr: 'pipe' })
    const code = await proc.exited
    return code === 0
  } catch {
    return false
  }
}

async function isProcessRunning(name: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(['pgrep', '-x', name], { stdout: 'pipe', stderr: 'pipe' })
    const code = await proc.exited
    return code === 0
  } catch {
    return false
  }
}

async function getTailscaleIp(): Promise<string | null> {
  try {
    const proc = Bun.spawn(['tailscale', 'ip', '-4'], { stdout: 'pipe', stderr: 'pipe' })
    const code = await proc.exited
    if (code !== 0) return null
    const text = await new Response(proc.stdout).text()
    return text.trim() || null
  } catch {
    return null
  }
}

export async function getTunnelStatus(port: number): Promise<TunnelProviderStatus[]> {
  const [cfInstalled, tsInstalled] = await Promise.all([
    commandExists('cloudflared'),
    commandExists('tailscale'),
  ])

  const [cfRunning, tsRunning] = await Promise.all([
    cfInstalled ? isProcessRunning('cloudflared') : Promise.resolve(false),
    tsInstalled ? isProcessRunning('tailscaled') : Promise.resolve(false),
  ])

  let tsUrl: string | null = null
  if (tsRunning) {
    const ip = await getTailscaleIp()
    if (ip) tsUrl = `http://${ip}:${port}`
  }

  return [
    {
      provider: 'cloudflare',
      installed: cfInstalled,
      running: cfRunning,
      url: null,
    },
    {
      provider: 'tailscale',
      installed: tsInstalled,
      running: tsRunning,
      url: tsUrl,
    },
  ]
}
