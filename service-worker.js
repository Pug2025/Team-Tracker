// -----------------------------
// Team Tracker – Service Worker
// Version: v3.7.5
// -----------------------------

const CACHE_VERSION = 'team-tracker-cache-v3.7.5';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(ASSETS_TO_CACHE)).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => {
            cache.put(req, copy).catch(() => {});
          });
          return response;
        })
        .catch(() => {
          // Optional: offline fallback only for navigation
          if (req.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
