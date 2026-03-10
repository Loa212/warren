// Warren Service Worker — basic asset caching for PWA offline support
// Strategy: Cache-first for static assets, network-only for WebSocket connections

const CACHE_NAME = 'warren-v0.1.0'

const PRECACHE_ASSETS = ['/', '/index.html', '/manifest.json', '/icons/icon-192.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Never cache WebSocket upgrades or API calls
  if (url.pathname.startsWith('/ws') || url.pathname.startsWith('/health')) {
    return
  }

  // Cache-first for everything else
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ??
        fetch(event.request).then((response) => {
          // Cache successful GET responses for static assets
          if (event.request.method === 'GET' && response.ok) {
            const cloned = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned))
          }
          return response
        }),
    ),
  )
})
