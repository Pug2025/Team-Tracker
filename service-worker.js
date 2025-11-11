// service-worker.js
// Team Tracker PWA cache controller
// This file is versioned via ?v=3602 in index.html registration.

const CACHE_VERSION = 'v3602';
const STATIC_CACHE = 'team-tracker-static-' + CACHE_VERSION;

// List of core assets to cache for offline use.
// Adjust paths if your files live in a subfolder.
const ASSETS = [
  '/',               // if hosted at domain root; remove if that breaks things on your host
  '/index.html',
  '/manifest.json',
  // Icons / images (update these to match your actual filenames/paths)
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(ASSETS))
      .catch(() => {
        // If something fails, we don't want to break install completely.
        // It's fine: the app can still fetch from network.
      })
  );
  // Activate new worker immediately once installed
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('team-tracker-static-') && key !== STATIC_CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for HTML, cache-first for static assets.
// This avoids getting stuck on an ancient index.html.
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only manage same-origin requests
  if (url.origin !== self.location.origin) return;

  // For HTML pages (navigation requests) => network first, fallback to cache
  const isHTML =
    request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Stash a copy in cache for offline
          const copy = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          // If offline, try cached index.html (or any cached match)
          caches.match(request).then(res => res || caches.match('/index.html'))
        )
    );
    return;
  }

  // For known static assets => cache-first, then network
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      return fetch(request)
        .then(response => {
          // Optionally cache static stuff on the fly
          const copy = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => {
          // If this fails (offline + not cached), just let it error.
          // You could return a fallback here if you want.
          return new Response('', { status: 504, statusText: 'Offline' });
        });
    })
  );
});
