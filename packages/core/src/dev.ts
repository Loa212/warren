// Dev entry point — starts a Warren server with a printed token
// Usage: bun run dev (from packages/core)

import { startServer } from './server'
import { loadConfig } from './config'

const config = loadConfig()
const token = crypto.randomUUID()

console.log('\n  Warren dev server')
console.log('  ─────────────────────────────────────────')
console.log(`  WebSocket:  ws://localhost:${config.port}/ws`)
console.log(`  Health:     http://localhost:${config.port}/health`)
console.log(`  Token:      ${token}`)
console.log('  ─────────────────────────────────────────')
console.log('  Open the PWA and add host:')
console.log(`    Address: localhost:${config.port}`)
console.log(`    Token:   ${token}`)
console.log('\n  Ctrl+C to stop\n')

startServer({ token, config })
