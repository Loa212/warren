import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { startServer } from '@warren/core'
import { Warren } from '../warren'

const TEST_PORT = 19470
const TEST_TOKEN = 'sdk-test-token'

let server: ReturnType<typeof startServer>

beforeAll(() => {
  server = startServer({
    port: TEST_PORT,
    token: TEST_TOKEN,
    config: {
      nodeId: 'sdk-test-node',
      hostMode: false,
      shell: '/bin/sh',
      port: TEST_PORT,
      theme: 'tokyo-night',
      logging: false,
    },
  })
})

afterAll(async () => {
  await server.stop(true)
})

describe('Warren SDK integration', () => {
  test('connect and disconnect with token auth', async () => {
    const warren = new Warren({
      host: 'localhost',
      port: TEST_PORT,
      token: TEST_TOKEN,
      autoReconnect: false,
    })

    await warren.connect()
    expect(warren.isConnected).toBe(true)

    warren.disconnect()
    expect(warren.isConnected).toBe(false)
  })

  test('getHealth returns server info', async () => {
    const warren = new Warren({
      host: 'localhost',
      port: TEST_PORT,
      token: TEST_TOKEN,
      autoReconnect: false,
    })

    const health = await warren.getHealth()
    expect(health.status).toBe('ok')
    expect(health.nodeId).toBe('sdk-test-node')
    expect(typeof health.uptime).toBe('number')

    warren.disconnect()
  })

  test('createSession, write, receive data, kill', async () => {
    const warren = new Warren({
      host: 'localhost',
      port: TEST_PORT,
      token: TEST_TOKEN,
      autoReconnect: false,
    })

    await warren.connect()

    const session = await warren.createSession({ shell: '/bin/sh' })
    expect(session.id).toBeTruthy()
    expect(session.info.shell).toBe('/bin/sh')

    // Collect output
    const output: string[] = []
    session.onData((data) => output.push(data))

    // Write a command that produces known output
    session.write('echo SDK_TEST_OK\n')

    // Wait for output
    await new Promise<void>((resolve) => {
      const check = setInterval(() => {
        if (output.join('').includes('SDK_TEST_OK')) {
          clearInterval(check)
          resolve()
        }
      }, 50)
      // Timeout after 5s
      setTimeout(() => {
        clearInterval(check)
        resolve()
      }, 5000)
    })

    expect(output.join('')).toContain('SDK_TEST_OK')

    // Kill the session
    await session.kill()
    expect(session.isEnded).toBe(true)

    warren.disconnect()
  })

  test('resize sends without error', async () => {
    const warren = new Warren({
      host: 'localhost',
      port: TEST_PORT,
      token: TEST_TOKEN,
      autoReconnect: false,
    })

    await warren.connect()

    const session = await warren.createSession()
    session.resize(120, 40)

    // No error means success
    await session.kill()
    warren.disconnect()
  })

  test('listRemoteSessions returns sessions', async () => {
    const warren = new Warren({
      host: 'localhost',
      port: TEST_PORT,
      token: TEST_TOKEN,
      autoReconnect: false,
    })

    await warren.connect()
    const session = await warren.createSession()

    const sessions = await warren.listRemoteSessions()
    expect(sessions.length).toBeGreaterThanOrEqual(1)
    expect(sessions.some((s) => s.id === session.id)).toBe(true)

    await session.kill()
    warren.disconnect()
  })

  test('events fire correctly', async () => {
    const warren = new Warren({
      host: 'localhost',
      port: TEST_PORT,
      token: TEST_TOKEN,
      autoReconnect: false,
    })

    let connected = false
    let sessionCreated = false
    let sessionEnded = false

    warren.on('connected', () => {
      connected = true
    })
    warren.on('session:created', () => {
      sessionCreated = true
    })
    warren.on('session:ended', () => {
      sessionEnded = true
    })

    await warren.connect()
    expect(connected).toBe(true)

    const session = await warren.createSession()
    expect(sessionCreated).toBe(true)

    await session.kill()
    // Give a tick for the event to fire
    await new Promise((r) => setTimeout(r, 100))
    expect(sessionEnded).toBe(true)

    warren.disconnect()
  })
})
