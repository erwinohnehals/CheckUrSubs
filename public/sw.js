// Версия меняется автоматически при каждом деплое через timestamp
// Vite подставляет его через vite.config.js
const CACHE_VERSION = self.__CACHE_VERSION__ || 'dev';
const CACHE_NAME    = `checkursubs-${CACHE_VERSION}`;

// ─── Install: ничего не кэшируем заранее, всё lazy ────────────────────────────
self.addEventListener('install', () => {
  // НЕ вызываем skipWaiting здесь — ждём команды от клиента (main.jsx).
  // Это позволяет не ломать открытую вкладку внезапной сменой SW.
  // main.jsx сам пошлёт SKIP_WAITING когда новый SW будет готов.
});

// ─── Слушаем команду от main.jsx ──────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Activate: удаляем все старые кэши ────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: стратегия кэширования ─────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Внешние запросы — никогда не кэшируем
  if (!url.origin.includes(self.location.hostname)) return;

  // index.html и навигационные запросы — всегда сеть, кэш только как fallback
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // JS/CSS с хешем в имени — кэш навсегда (они иммутабельны)
  if (/\.(js|css)$/.test(url.pathname) && /[a-f0-9]{8}/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  // Всё остальное — network-first
  event.respondWith(
    fetch(request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
