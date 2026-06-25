const CACHE_NAME = 'ispirato-revenda-v1.6';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.ico',
  '/share.jpg'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event (Cleanup old caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Message Event (Support immediate SKIP_WAITING from index.html)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch Event (Advanced caching strategy)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Bypass caching for non-GET requests or external Google/Firebase APIs
  if (
    event.request.method !== 'GET' ||
    url.href.includes('firestore.googleapis.com') ||
    url.href.includes('firebase') ||
    url.href.includes('google') ||
    url.href.includes('googleapis') ||
    url.href.includes('gstatic') ||
    url.href.includes('vitals')
  ) {
    return;
  }

  // 2. Network-First for everything by default to ensure freshness
  // We prioritize the network to avoid the "stale data" problem reported by the user
  event.respondWith(
    fetch(new Request(event.request, { cache: 'no-cache' }))
      .then((networkResponse) => {
        // If successful, cache a copy
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network fails (offline support)
        return caches.match(event.request);
      })
  );
});
