// Al-Ghazali Admin PWA Service Worker
// v2 — Admin pages are NEVER cached. A stale admin shell survives new deploys
// and forces a manual hard reload, which is unacceptable for a portal that
// sends live email. Only offline attendance queue data benefits from caching,
// and that lives in localStorage, so this worker now serves the network for
// everything and only intervenes to report offline state cleanly.
const CACHE_NAME = 'aghs-admin-v2';
const PRECACHE_URLS = [
  '/admin',
  '/logo.png',
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

// Let the page ask a newly downloaded worker to take over immediately instead
// of waiting for every open tab to close.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Never intercept anything in local development. The cache-first rule below
  // is only safe because production chunks are content-hashed; Next.js dev
  // chunk names are stable across rebuilds, so a cache hit would replay the
  // previous build and the admin would keep seeing old code until the cache
  // was cleared by hand.
  if (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '[::1]' ||
    url.hostname === '0.0.0.0'
  ) {
    return;
  }

  // Don't intercept Firebase, Sanity or external APIs
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('sanity') ||
    url.hostname.includes('googleapis') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Static assets (_next/static, public images): Cache First with fallback.
  // These are content-hashed by Next.js, so a hit is always the right build.
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

  // Admin HTML documents and RSC payloads: NETWORK ONLY, never cached.
  // Caching these is what produced a stale admin screen after every deploy.
  if (event.request.mode === 'navigate' || url.pathname.startsWith('/admin')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Offline: explain instead of replaying a stale admin page, so the
        // admin never acts on out-of-date data.
        return new Response(
          '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline - AGHS Admin</title></head>' +
          '<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0a;color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;padding:24px;text-align:center">' +
          '<div><h1 style="font-size:22px;margin:0 0 10px">You are offline</h1>' +
          '<p style="font-size:14px;color:#a3a3a3;margin:0 0 18px">The admin portal needs an internet connection so you always see live data.</p>' +
          '<button onclick="location.reload()" style="padding:11px 22px;border-radius:10px;border:0;background:#14b8a6;color:#042f2e;font-weight:700;font-size:14px;cursor:pointer">Retry Connection</button>' +
          '</div></body></html>',
          {
            status: 503,
            headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
          }
        );
      })
    );
    return;
  }
});
