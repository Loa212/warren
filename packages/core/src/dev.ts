// Dev entry point — starts a Warren server with a printed token
// Usage: bun run dev (from packages/core)

import { networkInterfaces } from 'node:os'
import qrcode from 'qrcode-terminal'
import { loadConfig } from './config'
import { startServer } from './server'

function getLocalIp(): string {
  const nets = networkInterfaces()
  for (const iface of Object.values(nets)) {
    for (const info of iface ?? []) {
      if (info.family === 'IPv4' && !info.internal) return info.address
    }
  }
  return '127.0.0.1'
}

const config = loadConfig()
const token = crypto.randomUUID()
const ip = getLocalIp()
const webPort = 3999
const connectUrl = `http://${ip}:${webPort}/connect?host=${encodeURIComponent(`${ip}:${config.port}`)}&token=${encodeURIComponent(token)}`

console.log('\n  Warren dev server')
console.log('  ─────────────────────────────────────────')
console.log(`  Local:      ws://localhost:${config.port}/ws`)
console.log(`  Network:    ws://${ip}:${config.port}/ws`)
console.log(`  Health:     http://localhost:${config.port}/health`)
console.log(`  Token:      ${token}`)
console.log('  ─────────────────────────────────────────')
console.log('  Open the PWA and add host:')
console.log(`    Address:  ${ip}:${config.port}`)
console.log(`    Token:    ${token}`)
console.log('')
console.log('  Or scan this QR code from your phone:')
console.log('')
qrcode.generate(connectUrl, { small: true }, (code: string) => {
  for (const line of code.split('\n')) {
    console.log(`    ${line}`)
  }
  console.log('')
  console.log(`  ${connectUrl}`)
  console.log('\n  Ctrl+C to stop\n')
})

startServer({ token, config })
