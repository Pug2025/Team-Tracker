// -----------------------------
// Team Tracker – Service Worker
// Version: v3.7.4
// -----------------------------

const CACHE_VERSION = 'team-tracker-cache-v3.7.4';

const ASSETS_TO_CACHE = [
  '/',              // root
  '/index.html',    // main shell
  '/manifest.json', // PWA manifest
  '/icon-192.png',  // app icons (keep filenames matching your actual icons)
  '/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key.startsWith('team-tracker-cache-') && key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  // Try cache first, then network
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;

      return fetch(request).then(networkResponse => {
        // Don’t cache non-OK responses or cross-origin stuff
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic'
        ) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_VERSION).then(cache => {
          cache.put(request, responseToCache);
        });

        return networkResponse;
      }).catch(() => cachedResponse || Promise.reject());
    })
  );
});
