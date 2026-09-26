// Al-Ghazali Admin PWA Service Worker
const CACHE_NAME = 'aghs-admin-v1';
const PRECACHE_URLS = [
  '/admin',
  '/admin/qr-attendance',
  '/logo.png',
  '/manifest.json',
  '/admin-manifest.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Pre-caching partial failure, will cache on demand:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Don't intercept Firebase, Sanity or external APIs
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('sanity') ||
    url.hostname.includes('googleapis') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Static Assets (_next/static, public images): Cache First with fallback
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);
      })
    );
    return;
  }

  // HTML / Admin Page Navigation: Network First with Cache fallback
  if (event.request.mode === 'navigate' || url.pathname.startsWith('/admin')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) return cachedResponse;
          // Fallback to /admin shell if available
          const adminShell = await caches.match('/admin');
          if (adminShell) return adminShell;
          return new Response('Offline: Please connect to the internet to load this admin page.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        })
    );
  }
});
