
// sw.js — cache + background sync (v3.2, scope-safe, 2 páginas)
const CACHE = 'gondolas-v3-2';
const SCOPE_URL = new URL(self.registration.scope);
const BASE = SCOPE_URL.pathname.endsWith('/') ? SCOPE_URL.pathname.slice(0,-1) : SCOPE_URL.pathname;

// Precarga landing y cámara
const ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/capture.html`,
  `${BASE}/sw.js`
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const copy = net.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return net;
      } catch {
        // fallback: si es cámara, caer a index por si falta sesión
        const url = new URL(req.url);
        if (url.pathname.endsWith('/capture.html')) {
          const idx = await caches.match(`${BASE}/index.html`);
          if (idx) return idx;
        }
        const cached = await caches.match(req);
        if (cached) return cached;
        return caches.match(`${BASE}/index.html`);
      }
    })());
    return;
  }
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return resp;
      }).catch(() => caches.match(`${BASE}/index.html`)))
    );
  }
});

// Background Sync para pedir al cliente que procese outbox
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-outbox') {
    event.waitUntil((async () => {
      const allClients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const c of allClients) c.postMessage({ type:'SYNC_OUTBOX' });
    })());
  }
});
