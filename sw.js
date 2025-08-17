// sw.js
const CACHE_VERSION = 'v1.0.0';
const APP_CACHE = `math-quest-${CACHE_VERSION}`;
const ASSETS = [
  '/math-quest/',               // root for project site
  '/math-quest/index.html',
  '/math-quest/css/style.css',
  '/math-quest/js/main.js',
  '/math-quest/manifest.webmanifest',
  '/math-quest/offline.html',
  '/math-quest/assets/icons/icon-192.png',
  '/math-quest/assets/icons/icon-512.png',
  '/math-quest/assets/icons/maskable-192.png',
  '/math-quest/assets/icons/maskable-512.png'
];

// Install: warm the cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key.startsWith('math-quest-') && key !== APP_CACHE ? caches.delete(key) : undefined))
    )
  );
  self.clients.claim();
});

// Fetch strategy: network-first for HTML, cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin
  if (url.origin !== location.origin) return;

  // HTML pages: try network, fall back to cache, then offline page
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(APP_CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(async () => (await caches.match(request)) || caches.match('/math-quest/offline.html'))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(APP_CACHE).then((cache) => cache.put(request, copy));
      return res;
    }))
  );
});
