// -----------------------------
// Team Tracker – Service Worker
// Version: v3.7.2
// -----------------------------

const CACHE_VERSION = 'team-tracker-cache-v3.7.2';

const ASSETS_TO_CACHE = [
  '/',               // root
  '/index.html',
  '/style.css',      // if you have separate files; ignore if not
  '/script.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// -----------------------------
// Install – cache static files
// -----------------------------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// -----------------------------
// Activate – delete old caches
// -----------------------------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// -----------------------------
// Fetch – network first, fallback to cache
// -----------------------------
self.addEventListener('fetch', event => {
  const req = event.request;

  // Only cache GET requests
  if (req.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(req)
      .then(response => {
        // Cache a copy
        const responseClone = response.clone();
        caches.open(CACHE_VERSION).then(cache => cache.put(req, responseClone));
        return response;
      })
      .catch(() =>
        caches.match(req).then(cached => cached || Promise.reject('no-match'))
      )
  );
});
