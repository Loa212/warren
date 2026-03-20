// @warren/cli — terminal UI helpers (colors, tables, status indicators)

// ── ANSI color codes ────────────────────────────────────────────────────────

const PURPLE = '\x1b[38;2;183;148;244m'
const CORAL = '\x1b[38;2;242;139;130m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const DIM = '\x1b[2m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

export const c = {
  purple: (s: string) => `${PURPLE}${s}${RESET}`,
  coral: (s: string) => `${CORAL}${s}${RESET}`,
  green: (s: string) => `${GREEN}${s}${RESET}`,
  yellow: (s: string) => `${YELLOW}${s}${RESET}`,
  red: (s: string) => `${RED}${s}${RESET}`,
  dim: (s: string) => `${DIM}${s}${RESET}`,
  bold: (s: string) => `${BOLD}${s}${RESET}`,
}

// ── Status output ───────────────────────────────────────────────────────────

export function banner(): void {
  console.log(`${c.purple('🐇 warren')} ${c.dim('— your terminal mesh')}`)
}

export function success(msg: string): void {
  console.log(`${c.green('✓')} ${msg}`)
}

export function warn(msg: string): void {
  console.log(`${c.yellow('!')} ${msg}`)
}

export function error(msg: string): void {
  console.error(`${c.red('✗')} ${msg}`)
}

export function info(msg: string): void {
  console.log(`${c.purple('→')} ${msg}`)
}

// ── Table formatting ────────────────────────────────────────────────────────

/** Strip ANSI escape sequences for width calculation */
function stripAnsi(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ANSI escape sequences use control chars by definition
  return s.replace(/\x1b\[[0-9;]*m/g, '')
}

export function table(headers: string[], rows: string[][]): void {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => stripAnsi(r[i] ?? '').length)),
  )

  const headerLine = headers.map((h, i) => {
    const w = widths[i] ?? 0
    return c.bold(h.padEnd(w))
  })
  console.log(headerLine.join('  '))
  console.log(widths.map((w) => c.dim('─'.repeat(w))).join('  '))

  for (const row of rows) {
    const padded = row.map((cell, i) => {
      const visible = stripAnsi(cell).length
      const w = widths[i] ?? 0
      const pad = Math.max(0, w - visible)
      return cell + ' '.repeat(pad)
    })
    console.log(padded.join('  '))
  }
}
