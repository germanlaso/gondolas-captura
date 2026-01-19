
// sw.js — cache + background sync (v3.1, scope-safe, fallback a "/")
const CACHE = 'gondolas-v3-1';

// 1) Descubre el subpath real donde el SW controla
const SCOPE_URL = new URL(self.registration.scope);
const BASE = SCOPE_URL.pathname.endsWith('/')
  ? SCOPE_URL.pathname.slice(0, -1)
  : SCOPE_URL.pathname;

// 2) Precachea rutas relativas al scope real (usar "/" además de "index.html")
const ASSETS = [
  `${BASE}/`,
  `${BASE}/sw.js`
  // Agrega aquí otros assets estáticos si aplica (icons, manifest, css…):
  // `${BASE}/icons/icon-192.png`, `${BASE}/manifest.json`, …
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

// 3) Estrategia de fetch con soporte a "navigate" y fallback a BASE+"/"
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // a) Navegación (PWA / app shell)
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      // Primero online, si falla => cache, si no => fallback a "/"
      try {
        const net = await fetch(req);
        // cachea copia para volver offline-friendly
        const copy = net.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return net;
      } catch {
        const cached = await caches.match(req);
        if (cached) return cached;
        return caches.match(`${BASE}/`);
      }
    })());
    return;
  }

  // b) Recursos GET (js, css, imgs)
  if (req.method === 'GET') {
    event.respondWith(
      caches.match(req).then(hit => {
        if (hit) return hit;
        return fetch(req).then(resp => {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return resp;
        }).catch(() => caches.match(`${BASE}/`));
      })
    );
  }
});

// 4) Background Sync → pedir al cliente que envíe la outbox
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-outbox') {
    event.waitUntil((async () => {
      const allClients = await self.clients.matchAll({ includeUncontrolled: true });
      for (const c of allClients) c.postMessage({ type: 'SYNC_OUTBOX' });
    })());
  }
});


