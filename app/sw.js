// Finanční deník · sw.js · v0.7.0
// Offline: stránka a skripty z mezipaměti, když není síť. Firebase si data drží sám.
// Při každé nové verzi zvyš CACHE, jinak uživatelům zůstane stará verze.
const CACHE = 'fd-0.7.0';
const SOUBORY = ['./', 'index.html', 'css/app.css', 'css/fonty.css', 'manifest.json', 'icons/icon.svg',
  'js/app.js', 'js/util.js', 'js/logic.js', 'js/data.js', 'js/store.js', 'js/views.js', 'js/charts.js', 'js/config.js', 'js/cloud.js', 'js/hlas.js', 'js/blocek.js', 'js/zivot.js', 'js/zivot-data.js', 'js/kronika.js', 'js/sklenice.js', 'js/tracker.js', 'js/tyden.js', 'js/nalepky.js', 'js/kniha.js', 'js/tisk.js', 'js/uctenky.js', 'js/googleapp.js', 'js/seznamy.js'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SOUBORY)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
// Vlastní soubory: nejdřív síť (aby se nová verze projevila hned), bez sítě mezipaměť.
// Cizí adresy (Firebase, písma) neřešíme – ty si drží prohlížeč a Firebase sám.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const k = r.clone(); caches.open(CACHE).then(c => c.put(e.request, k)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('index.html'))));
});
