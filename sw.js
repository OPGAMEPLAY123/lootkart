// Name of the cache
const CACHE_NAME = 'lootkart-cache-v1';

// Files to cache for offline
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',          // if you have a JS file
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event: caching files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
  self.clients.claim();
});

// Fetch event: serve cached files when offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
