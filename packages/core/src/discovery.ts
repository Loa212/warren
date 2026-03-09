// Discovery — Bonjour/mDNS service advertisement and discovery
//
// Plan for v0.2 implementation:
//   Option A (preferred): Use the `bonjour-service` npm package which wraps
//     native mDNS. It provides advertise() / find() APIs with a callback model.
//     Install: bun add bonjour-service
//
//   Option B: Use `@homebridge/dbus-native` + Avahi (Linux) for native D-Bus
//     integration. macOS uses the built-in mDNSResponder.
//
//   Option C: Call `dns_sd` C library via Bun's FFI (bun:ffi) for truly native
//     macOS Bonjour without a wrapper. Most performant, but more complex.
//
// Service type: _warren._tcp
// TXT records: version, nodeId, hostName, hostMode, port
//
// See: https://developer.apple.com/bonjour/
//      https://www.npmjs.com/package/bonjour-service

import type { WarrenServiceInfo } from '@warren/types'

export async function advertise(info: WarrenServiceInfo): Promise<void> {
  // TODO(v0.2): Implement Bonjour advertisement
  // Example with bonjour-service:
  //
  //   import Bonjour from 'bonjour-service'
  //   const bonjour = new Bonjour()
  //   bonjour.publish({
  //     name: `Warren - ${info.hostName}`,
  //     type: 'warren',
  //     port: info.port,
  //     txt: {
  //       version: info.version,
  //       nodeId: info.nodeId,
  //       hostName: info.hostName,
  //       hostMode: String(info.hostMode),
  //     },
  //   })

  console.log(`TODO: Bonjour advertisement for node ${info.nodeId} on port ${info.port}`)
}

export async function* discover(): AsyncIterable<WarrenServiceInfo> {
  // TODO(v0.2): Implement Bonjour discovery
  // Example with bonjour-service:
  //
  //   import Bonjour from 'bonjour-service'
  //   const bonjour = new Bonjour()
  //   const browser = bonjour.find({ type: 'warren' })
  //   browser.on('up', (service) => {
  //     yield {
  //       version: service.txt.version,
  //       nodeId: service.txt.nodeId,
  //       hostName: service.txt.hostName,
  //       hostMode: service.txt.hostMode === 'true',
  //       port: service.port,
  //     }
  //   })

  console.log('TODO: Bonjour discovery — stub yields nothing')
  // yields nothing in v0.1
}
