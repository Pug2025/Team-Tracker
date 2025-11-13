/* Team Tracker PWA SW — v3.7.3 */
const CACHE_NAME = 'team-tracker-cache-v373';
const CORE_ASSETS = [
  './',
  './index.html?v=373',
  './manifest.json?v=373'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((netRes) => {
          if (!netRes || netRes.status !== 200) return netRes;
          const copy = netRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return netRes;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
