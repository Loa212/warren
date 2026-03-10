// Discovery — Bonjour/mDNS service advertisement and discovery
//
// Uses `bonjour-service` for cross-platform mDNS.
// Service type: _warren._tcp
// TXT records: version, nodeId, hostName, hostMode

import type { WarrenServiceInfo } from '@warren/types'
import BonjourModule, { type Service } from 'bonjour-service'

// bonjour-service is CJS — handle both ESM default and direct export
const Bonjour =
  typeof BonjourModule === 'function'
    ? BonjourModule
    : (BonjourModule as { default: typeof BonjourModule }).default

type BonjourInstance = InstanceType<typeof Bonjour>
let bonjourInstance: BonjourInstance | null = null
let publishedService: Service | null = null

function getBonjourInstance(): BonjourInstance {
  if (!bonjourInstance) {
    // reuseAddr: share port 5353 with macOS's built-in mDNSResponder
    // instead of fighting over it (which triggers hostname conflict dialogs).
    // The opts object is passed through to multicast-dns which supports reuseAddr.
    bonjourInstance = new Bonjour({ reuseAddr: true } as Record<string, unknown>)
  }
  return bonjourInstance
}

/**
 * Advertise this Warren node on the local network via mDNS.
 * Call `stopAdvertising()` to unpublish.
 */
export function advertise(info: WarrenServiceInfo): void {
  stopAdvertising()

  const bonjour = getBonjourInstance()
  publishedService = bonjour.publish({
    name: `Warren - ${info.hostName}`,
    type: 'warren',
    port: info.port,
    txt: {
      version: info.version,
      nodeId: info.nodeId,
      hostName: info.hostName,
      hostMode: String(info.hostMode),
    },
  })

  console.log(
    `[warren] mDNS: advertising _warren._tcp on port ${info.port} (node: ${info.nodeId.slice(0, 8)})`,
  )
}

/**
 * Stop advertising this node.
 */
export function stopAdvertising(): void {
  if (publishedService) {
    publishedService.stop?.()
    publishedService = null
  }
}

/**
 * Discover Warren nodes on the local network.
 * Returns an AsyncIterable that yields discovered services.
 * Pass an AbortSignal to stop discovery.
 */
export async function* discover(signal?: AbortSignal): AsyncIterable<WarrenServiceInfo> {
  const bonjour = getBonjourInstance()
  const queue: WarrenServiceInfo[] = []
  let resolve: (() => void) | null = null
  let done = false

  const browser = bonjour.find({ type: 'warren' })

  browser.on('up', (service: Service) => {
    const txt = service.txt as Record<string, string> | undefined
    if (!txt) return

    const info: WarrenServiceInfo = {
      version: txt.version ?? '0.0.0',
      nodeId: txt.nodeId ?? '',
      hostName: txt.hostName ?? service.name,
      hostMode: txt.hostMode === 'true',
      port: service.port,
    }
    queue.push(info)
    resolve?.()
  })

  const cleanup = () => {
    done = true
    browser.stop()
    resolve?.()
  }

  signal?.addEventListener('abort', cleanup, { once: true })

  try {
    while (!done) {
      const next = queue.shift()
      if (next) {
        yield next
      } else {
        await new Promise<void>((r) => {
          resolve = r
        })
      }
    }
    // Drain remaining
    for (const item of queue) {
      yield item
    }
  } finally {
    cleanup()
  }
}

/**
 * One-shot discovery: find nodes for a given duration (ms), then return all found.
 */
export function discoverOnce(timeoutMs = 3000): Promise<WarrenServiceInfo[]> {
  return new Promise((resolve) => {
    const results: WarrenServiceInfo[] = []
    const bonjour = getBonjourInstance()
    const browser = bonjour.find({ type: 'warren' })

    browser.on('up', (service: Service) => {
      const txt = service.txt as Record<string, string> | undefined
      if (!txt) return
      results.push({
        version: txt.version ?? '0.0.0',
        nodeId: txt.nodeId ?? '',
        hostName: txt.hostName ?? service.name,
        hostMode: txt.hostMode === 'true',
        port: service.port,
      })
    })

    setTimeout(() => {
      browser.stop()
      resolve(results)
    }, timeoutMs)
  })
}

/**
 * Destroy the shared Bonjour instance and clean up all resources.
 */
export function destroyDiscovery(): void {
  stopAdvertising()
  if (bonjourInstance) {
    bonjourInstance.destroy()
    bonjourInstance = null
  }
}
