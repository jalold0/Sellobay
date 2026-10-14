// Sellobay Service Worker — minimal offline cache strategy.
// CACHE VERSION'NI O'ZGARTIRGAN HAR SAFAR — eski cache avtomatik tozalanadi.
// Network-first for HTML/API, cache-first for static assets.

const CACHE_NAME = 'sellobay-v11'; // 2026-10-13: birinchi tashrifda reload yo'q, RSC/API SW'siz
const STATIC_ASSETS = ['/', '/manifest.webmanifest', '/icon', '/apple-icon'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => null)),
  );
  // skipWaiting bu yerda YO'Q: yangi versiya foydalanuvchi «Yangilash»ni bosganda
  // (SKIP_WAITING xabari) kuchga kiradi. Ilgari darhol kuchga kirib, birinchi tashrifda
  // ham sahifani o'z-o'zidan qayta yuklatardi.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 1. Eski cache'larni o'chiramiz (ecom-v1, sellobay-v1, sellobay-v2 va boshqalar)
      const keys = await caches.keys();
      const old = keys.filter((k) => k !== CACHE_NAME);
      await Promise.all(old.map((k) => caches.delete(k)));

      // 2. Hozirgi sahifalarni darhol nazoratga olamiz
      await self.clients.claim();

      // 3. "Yangilandi" signali — faqat haqiqatan eski versiya bo'lgan bo'lsa
      //    (birinchi o'rnatishda «Yangi versiya mavjud» chiqmasin).
      if (old.length === 0) return;
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

  // Sahifalararo o'tish (RSC so'rovlari) va API — SW'siz, to'g'ridan-to'g'ri tarmoqqa.
  // Ularni o'rab olish har bosishga SW ishga tushish vaqtini qo'shardi, foydasi esa yo'q.
  if (request.mode !== 'navigate') return;

  // HTML sahifa: NETWORK-FIRST — har doim eng yangi versiya.
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
