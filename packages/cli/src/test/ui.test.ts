// UI helpers test suite

import { describe, expect, it } from 'bun:test'
import { c } from '../ui'

describe('Color helpers', () => {
  it('should wrap text with ANSI purple', () => {
    const result = c.purple('hello')
    expect(result).toContain('hello')
    expect(result).toContain('\x1b[38;2;183;148;244m')
    expect(result).toEndWith('\x1b[0m')
  })

  it('should wrap text with ANSI green', () => {
    const result = c.green('ok')
    expect(result).toContain('ok')
    expect(result).toContain('\x1b[32m')
  })

  it('should wrap text with ANSI red', () => {
    const result = c.red('err')
    expect(result).toContain('err')
    expect(result).toContain('\x1b[31m')
  })

  it('should wrap text with ANSI yellow', () => {
    const result = c.yellow('warn')
    expect(result).toContain('warn')
    expect(result).toContain('\x1b[33m')
  })

  it('should wrap text with coral', () => {
    const result = c.coral('accent')
    expect(result).toContain('accent')
    expect(result).toContain('\x1b[38;2;242;139;130m')
  })

  it('should wrap text with bold', () => {
    const result = c.bold('strong')
    expect(result).toContain('strong')
    expect(result).toContain('\x1b[1m')
  })

  it('should wrap text with dim', () => {
    const result = c.dim('faint')
    expect(result).toContain('faint')
    expect(result).toContain('\x1b[2m')
  })

  it('should support nesting colors', () => {
    const result = c.bold(c.purple('nested'))
    expect(result).toContain('nested')
    expect(result).toContain('\x1b[1m')
    expect(result).toContain('\x1b[38;2;183;148;244m')
  })
})
