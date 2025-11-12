/* Team Tracker SW — v3.6.2 */
const CACHE_NAME = 'team-tracker-v3.6.2';
const CORE = [
  '/',                // only works if hosted at domain root; if not, remove this line
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

/* Install: pre-cache core */
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE).catch(() => {}))
  );
});

/* Activate: clear old caches */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

/* Strategy helpers */
const isHTML = (req) =>
  req.headers.get('accept')?.includes('text/html') ||
  req.destination === 'document';

/* Fetch:
   - HTML: network-first (so index changes take effect immediately)
   - Everything else: cache-first, then network fallback
*/
self.addEventListener('fetch', (e) => {
  const { request } = e;

  // Ignore non-GET (e.g., POST share targets) and chrome-extension requests
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension:')) return;

  if (isHTML(request)) {
    e.respondWith(
      fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          return resp;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for static assets
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((resp) => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          return resp;
        })
        .catch(() => cached); // final fallback if both fail
    })
  );
});
