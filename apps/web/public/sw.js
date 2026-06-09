// Sellobay Service Worker — minimal offline cache strategy.
// CACHE VERSION'NI O'ZGARTIRGAN HAR SAFAR — eski cache avtomatik tozalanadi.
// Network-first for HTML/API, cache-first for static assets.

const CACHE_NAME = 'sellobay-v8'; // ⚠️ V2 clean logo (oq fonsiz, tight crop)
const STATIC_ASSETS = ['/', '/manifest.webmanifest', '/icon', '/apple-icon'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => null)),
  );
  // Yangi SW darhol kuchga kiradi (eski versiyani kutmaydi)
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Eski cache'larni o'chiramiz (ecom-v1, sellobay-v1, sellobay-v2 va boshqalar)
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));

      // 2. Hozirgi sahifalarni darhol nazoratga olamiz
      await self.clients.claim();

      // 3. Barcha ochiq sahifalarga "yangilandi" signali yuboramiz
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
      });
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Faqat shu origin uchun cache
  if (url.origin !== self.location.origin) return;

  // Next.js HMR/dev fayllarni cache qilmaslik
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;
  if (url.pathname.startsWith('/_next/data')) return;

  // Statik: cache-first, lekin background'da yangilab tursin
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|woff2?|ttf|css|js)$/i)
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        const networkFetch = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || networkFetch;
      }),
    );
    return;
  }

  // HTML/dynamic: NETWORK-FIRST — har doim eng yangi versiyani olib keladi
  // Cache faqat offline holatda fallback sifatida
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        if (res.ok && res.headers.get('content-type')?.includes('text/html')) {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return res;
      })
      .catch(() => caches.match(request).then((c) => c || caches.match('/'))),
  );
});

// Push notifications uchun
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Sellobay', {
      body: data.body,
      icon: '/apple-icon',
      badge: '/icon',
      data: data.url ? { url: data.url } : undefined,
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(self.clients.openWindow(url));
});

// Foydalanuvchi qo'lda yangilashni so'rasa
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
