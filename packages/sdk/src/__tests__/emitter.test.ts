import { describe, expect, mock, test } from 'bun:test'
import { Emitter } from '../emitter'

type TestEvents = {
  data: [value: string]
  count: [n: number]
  empty: []
}

describe('Emitter', () => {
  test('on() and emit()', () => {
    const emitter = new Emitter<TestEvents>()
    const fn = mock()

    emitter.on('data', fn)
    emitter.emit('data', 'hello')

    expect(fn).toHaveBeenCalledWith('hello')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('on() returns unsubscribe function', () => {
    const emitter = new Emitter<TestEvents>()
    const fn = mock()

    const unsub = emitter.on('data', fn)
    emitter.emit('data', 'first')
    unsub()
    emitter.emit('data', 'second')

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('first')
  })

  test('once() fires only once', () => {
    const emitter = new Emitter<TestEvents>()
    const fn = mock()

    emitter.once('count', fn)
    emitter.emit('count', 1)
    emitter.emit('count', 2)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(1)
  })

  test('multiple listeners on same event', () => {
    const emitter = new Emitter<TestEvents>()
    const fn1 = mock()
    const fn2 = mock()

    emitter.on('data', fn1)
    emitter.on('data', fn2)
    emitter.emit('data', 'both')

    expect(fn1).toHaveBeenCalledWith('both')
    expect(fn2).toHaveBeenCalledWith('both')
  })

  test('events with no args', () => {
    const emitter = new Emitter<TestEvents>()
    const fn = mock()

    emitter.on('empty', fn)
    emitter.emit('empty')

    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('removeAllListeners() clears specific event', () => {
    const emitter = new Emitter<TestEvents>()
    const dataFn = mock()
    const countFn = mock()

    emitter.on('data', dataFn)
    emitter.on('count', countFn)
    emitter.removeAllListeners('data')
    emitter.emit('data', 'gone')
    emitter.emit('count', 42)

    expect(dataFn).not.toHaveBeenCalled()
    expect(countFn).toHaveBeenCalledWith(42)
  })

  test('removeAllListeners() with no args clears everything', () => {
    const emitter = new Emitter<TestEvents>()
    const fn1 = mock()
    const fn2 = mock()

    emitter.on('data', fn1)
    emitter.on('count', fn2)
    emitter.removeAllListeners()
    emitter.emit('data', 'gone')
    emitter.emit('count', 0)

    expect(fn1).not.toHaveBeenCalled()
    expect(fn2).not.toHaveBeenCalled()
  })

  test('emit on event with no listeners does not throw', () => {
    const emitter = new Emitter<TestEvents>()
    expect(() => emitter.emit('data', 'safe')).not.toThrow()
  })
})
