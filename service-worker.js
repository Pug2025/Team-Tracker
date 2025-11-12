/* service-worker.js — Team Tracker v3.6.3 */
const CACHE_VERSION = 'v3605';
const CACHE_NAME = `tt-cache-${CACHE_VERSION}`;

/* Put anything you want immediately available offline here. */
const PRECACHE_URLS = [
  '/',                // root for PWA installs
  '/index.html',      // main app shell
  '/manifest.json',   // PWA manifest
  // icons (adjust paths if yours differ)
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

/* On install: pre-cache the app shell and take control on next load. */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

/* On activate: clean up old caches. */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('tt-cache-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

/*
  Fetch strategy:
  - HTML navigations: Network first (falls back to cache).
  - Static assets: Stale-while-revalidate.
  - Everything else: Cache-first, then network.
*/
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Handle navigations (address bar, link clicks)
  if (req.mode === 'navigate') {
    event.respondWith(networkThenCacheHTML(req));
    return;
  }

  const url = new URL(req.url);

  // Treat our core shell files with stale-while-revalidate
  const isShellAsset =
    url.pathname === '/' ||
    url.pathname.endsWith('/index.html') ||
    url.pathname.endsWith('/manifest.json') ||
    url.pathname.startsWith('/icons/');

  if (isShellAsset) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  // Default: cache-first for other GETs
  if (req.method === 'GET') {
    event.respondWith(cacheFirst(req));
  }
});

/* === Strategies === */

async function networkThenCacheHTML(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    // Only cache successful responses
    if (fresh && fresh.status === 200) {
      cache.put('/index.html', fresh.clone());
    }
    return fresh;
  } catch (err) {
    // Offline or failed: serve cached index
    const cached = await cache.match('/index.html');
    if (cached) return cached;
    // Last resort: basic fallback
    return new Response('<h1>Offline</h1>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 503,
      statusText: 'Offline'
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(stripVersionQuery(request));
  const networkPromise = fetch(request)
    .then((res) => {
      if (res && res.status === 200) {
        cache.put(stripVersionPath(request), res.clone());
      }
      return res;
    })
    .catch(() => null);

  // Return cache immediately if present; otherwise wait for network
  return cached || (await networkPromise) || fetchFallback(request);
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(stripVersionQuery(request));
  if (cached) return cached;

  try {
    const res = await fetch(request);
    if (res && res.status === 200) {
      cache.put(stripVersionPath(request), res.clone());
    }
    return res;
  } catch (err) {
    return fetchFallback(request);
  }
}

/* Helpers to normalize cache keys so ?v=xxxx doesn’t fragment the cache */
function stripVersionQuery(request) {
  const url = new URL(request.url);
  if (url.searchParams.has('v')) {
    url.searchParams.delete('v');
    return new Request(url.toString(), { method: request.method, headers: request.headers, mode: request.mode, credentials: request.credentials, redirect: request.redirect, referrer: request.referrer, referrerPolicy: request.referrerPolicy, integrity: request.integrity, cache: request.cache });
  }
  return request;
}
function stripVersionPath(request) {
  // Use the same normalization when writing
  return stripVersionQuery(request);
}

/* Basic fallback for non-HTML requests */
function fetchFallback(request) {
  if (request.destination === 'document') {
    return new Response('<h1>Offline</h1>', {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 503,
      statusText: 'Offline'
    });
  }
  return new Response('', { status: 504, statusText: 'Gateway Timeout' });
}

/* Optional: allow pages to trigger an immediate update */
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
