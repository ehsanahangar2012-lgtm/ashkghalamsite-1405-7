// Service Worker for Ashk Ghalam v3.26.6 (Fast Immutable Asset Cache + Offline Fallback)
const CACHE_NAME = 'ashkghalam-v3.26.6';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const reqUrl = new URL(event.request.url);
  if (reqUrl.origin !== self.location.origin) return;

  const p = reqUrl.pathname;
  // Never intercept APIs, PHP routes, ZIP downloads, offline WASM studios, or dynamic uploads
  if (
    p.startsWith('/api/') ||
    p.includes('api.php') ||
    p.startsWith('/downloads/') ||
    p.startsWith('/uploads/') ||
    p.startsWith('/studio/') ||
    p === '/sw.js'
  ) {
    return;
  }

  // Cache-first for Vite's content-hashed static assets (/assets/*) — instant repeat loads
  if (p.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // Network-first for HTML navigation so fresh deploys always load immediately
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});
