// -----------------------------
// Team Tracker – Service Worker
// Version: v3.7.3
// -----------------------------

const CACHE_VERSION = 'team-tracker-cache-v3.7.3';

const STATIC_ASSETS = [
  './',              // app root (works under repo path)
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
  // Add './style.css', './script.js' here only if/when they exist
];

// -----------------------------
// Install – cache static files
// -----------------------------
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      Promise.all(
        STATIC_ASSETS.map(url =>
          fetch(url, { cache: 'no-store' })
            .then(response => {
              if (response.ok) {
                cache.put(url, response.clone());
              }
            })
            .catch(() => {
              // Ignore individual failures so install still succeeds
            })
        )
      )
    ).then(() => self.skipWaiting())
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
// Fetch
// - HTML: network-first, fallback to cached index.html
// - Other GETs: cache-first with background update
// -----------------------------
self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') {
    return;
  }

  const accept = req.headers.get('accept') || '';

  // Handle navigations / HTML specially
  if (req.mode === 'navigate' || accept.includes('text/html')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Static assets / API GETs – cache-first, then network fallback
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(req, copy));
          return response;
        })
        .catch(() => cached);

      // If we already have cache, return it immediately; otherwise wait for network
      return cached || fetchPromise;
    })
  );
});
