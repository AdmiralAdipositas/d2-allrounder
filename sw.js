// Offline-Hülle: App-Dateien aus dem Cache, Spieldaten im Hintergrund frisch, Bungie-API nie aus dem Cache.
const CACHE = 'd2a-v2';
const HUELLE = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/bungie.js', 'js/defs.js', 'js/vault.js', 'js/config.js', 'icons/icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(HUELLE))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Netz zuerst, damit Updates sofort ankommen; Cache nur, wenn offline.
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const kopie = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, kopie)); }
    return r;
  }).catch(() => caches.match(e.request)));
});
