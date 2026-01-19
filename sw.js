// sw.js — cache + background sync
const CACHE = 'gondolas-v1';
const ASSETS = [
  '/',
  '/index_batch.html',
  '/sw.js'
  // agrega aquí otros assets (CSS, íconos, manifest) si corresponde
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // limpieza de caches viejos si cambias versión
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return resp;
    }).catch(() => caches.match('/index_batch.html')))
  );
});

// Background Sync para pedir al cliente que envíe la outbox
self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-outbox') {
    event.waitUntil((async () => {
      const allClients = await self.clients.matchAll({includeUncontrolled:true});
      for (const c of allClients) { c.postMessage({type:'SYNC_OUTBOX'}); }
    })());
  }
});
