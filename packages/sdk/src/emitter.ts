// Minimal typed event emitter — no Node.js dependency

// biome-ignore lint/suspicious/noExplicitAny: event emitter requires flexible typing
type Listener = (...args: any[]) => void

/**
 * Lightweight typed event emitter.
 *
 * @example
 * ```ts
 * const emitter = new Emitter<{ data: [string]; close: [] }>()
 * emitter.on('data', (chunk) => console.log(chunk))
 * emitter.emit('data', 'hello')
 * ```
 */
export class Emitter<Events extends Record<string, unknown[]>> {
  private listeners = new Map<keyof Events, Set<Listener>>()

  /** Subscribe to an event. Returns an unsubscribe function. */
  on<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): () => void {
    let set = this.listeners.get(event)
    if (!set) {
      set = new Set()
      this.listeners.set(event, set)
    }
    set.add(listener as Listener)
    return () => set.delete(listener as Listener)
  }

  /** Subscribe to an event, but only fire once. */
  once<K extends keyof Events>(event: K, listener: (...args: Events[K]) => void): () => void {
    const unsub = this.on(event, ((...args: Events[K]) => {
      unsub()
      listener(...args)
    }) as (...args: Events[K]) => void)
    return unsub
  }

  /** Emit an event with the given arguments. */
  emit<K extends keyof Events>(event: K, ...args: Events[K]): void {
    const set = this.listeners.get(event)
    if (!set) return
    for (const listener of set) {
      listener(...args)
    }
  }

  /** Remove all listeners (or all listeners for a specific event). */
  removeAllListeners(event?: keyof Events): void {
    if (event) {
      this.listeners.delete(event)
    } else {
      this.listeners.clear()
    }
  }
}
