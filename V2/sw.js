
// sw.js — cache + background sync (v3.1, scope-safe)
const CACHE = 'gondolas-v3-1';
const SCOPE_URL = new URL(self.registration.scope);
const BASE = SCOPE_URL.pathname.endsWith('/') ? SCOPE_URL.pathname.slice(0,-1) : SCOPE_URL.pathname;
const ASSETS = [ `${BASE}/`, `${BASE}/sw.js` ];

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

