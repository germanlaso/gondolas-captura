
// sw.js — cache + background sync (v3, scope-safe)
const CACHE = 'gondolas-v3';

// Descubre el subpath real donde está controlando el SW (scope)
const SCOPE_URL = new URL(self.registration.scope);
const BASE = SCOPE_URL.pathname.endsWith('/')
  ? SCOPE_URL.pathname.slice(0, -1)
  : SCOPE_URL.pathname;

// Precachea con rutas relativas al scope real
const ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/sw.js`
  // agrega aquí otros assets estáticos si corresponde, por ejemplo:
  // `${BASE}/icons/icon-192.png`, `${BASE}/manifest.json`, etc.
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
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return resp;
      }).catch(() => caches.match(`${BASE}/index.html`));
    })
  );
});

// Background Sync para pedir al cliente que envíe la outbox
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-outbox') {
    event.waitUntil((async () => {
      const allClients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const c of allClients) c.postMessage({ type: 'SYNC_OUTBOX' });
    })());
  }
});

