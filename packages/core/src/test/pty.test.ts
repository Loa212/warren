// Basic PTY integration test
// Run: bun test

import { afterEach, describe, expect, it } from 'bun:test'
import { createSession, killSession, listSessions, onData, writeToSession } from '../pty'

describe('PTY Manager', () => {
  const createdSessions: string[] = []

  afterEach(() => {
    // Clean up any sessions created during tests
    for (const id of createdSessions) {
      killSession(id)
    }
    createdSessions.length = 0
  })

  it('should create a session and return a TerminalSession', () => {
    const session = createSession()
    createdSessions.push(session.id)

    expect(session.id).toBeString()
    expect(session.shell).toBeString()
    expect(session.cols).toBe(80)
    expect(session.rows).toBe(24)
    expect(session.startedAt).toBeNumber()
  })

  it('should list active sessions', () => {
    const before = listSessions().length
    const s1 = createSession()
    const s2 = createSession()
    createdSessions.push(s1.id, s2.id)

    const after = listSessions()
    expect(after.length).toBe(before + 2)
  })

  it('should kill a session', () => {
    const session = createSession()
    const before = listSessions().length

    killSession(session.id)

    // Session should be removed from the map
    expect(listSessions().length).toBe(before - 1)
  })

  it('should receive output from the PTY', async () => {
    // Use a non-interactive shell that immediately runs a command and exits.
    // This avoids waiting for interactive shell startup (rc files, prompts).
    const session = createSession('/bin/sh')
    createdSessions.push(session.id)

    const output = await new Promise<string>((resolve, reject) => {
      let collected = ''
      const timeout = setTimeout(
        () => reject(new Error(`Timeout. Collected so far: ${JSON.stringify(collected)}`)),
        10000,
      )

      onData(session.id, (data) => {
        collected += data
        if (collected.includes('warren-test-ok')) {
          clearTimeout(timeout)
          resolve(collected)
        }
      })

      // Send command immediately — /bin/sh is fast to start in interactive mode
      setTimeout(() => {
        writeToSession(session.id, 'echo warren-test-ok\r')
      }, 300)
    })

    expect(output).toContain('warren-test-ok')
  })
})
