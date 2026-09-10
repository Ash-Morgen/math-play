/* 数学岛 — Service Worker
   策略：network-first（在线永远拿最新代码，离线回退缓存）
   自用场景下开发迭代频繁，缓存优先会导致改了代码刷新看不到，因此不用 cache-first。 */
const CACHE = 'mathplay-v3';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './grade2.html',
  './grade2.css',
  './drag.js',
  './drag-extra.js',
  './match.js',
  './mine.js',
  './balance.js',
  './grade2.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // 只接管本站资源

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});
