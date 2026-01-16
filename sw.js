// sw.js — mínimo para Background Sync
self.addEventListener('install', (e)=> self.skipWaiting());
self.addEventListener('activate', (e)=> self.clients.claim());

// Background Sync para pedir al cliente que envíe la outbox
self.addEventListener('sync', async (event)=>{
  if(event.tag === 'sync-outbox'){
    event.waitUntil((async ()=>{
      const allClients = await self.clients.matchAll({includeUncontrolled:true});
      for(const c of allClients){ c.postMessage({type:'SYNC_OUTBOX'}); }
    })());
  }
});
