// Offline-Hülle: App-Dateien aus dem Cache, Spieldaten im Hintergrund frisch, Bungie-API nie aus dem Cache.
const CACHE = 'd2a-v3';
const HUELLE = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/bungie.js', 'js/defs.js', 'js/vault.js', 'js/config.js', 'icons/icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(HUELLE))); self.skipWaiting(); });
const DATEN = 'd2a-daten';
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== CACHE && x !== DATEN && x !== 'd2a-profil').map((x) => caches.delete(x))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Große Spieldaten: sofort aus dem Cache, im Hintergrund aktualisieren (nächster Start hat die neue Version).
  if (/\/data\/[^/]+\.json$/.test(url.pathname) || url.pathname.includes('/guide/')) {
    e.respondWith(caches.open(DATEN).then(async (c) => {
      const alt = await c.match(e.request);
      const neu = fetch(e.request, { cache: 'no-cache' }).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => alt);
      return alt || neu;
    }));
    return;
  }
  // Netz zuerst, damit Updates sofort ankommen; Cache nur, wenn offline.
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then((r) => {
    if (r.ok) { const kopie = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, kopie)); }
    return r;
  }).catch(() => caches.match(e.request)));
});
