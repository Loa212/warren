// Minimal service worker — satisfies Chrome PWA installability check
// No caching, no offline support (intentional)
self.addEventListener('fetch', () => {})
