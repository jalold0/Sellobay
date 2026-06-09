'use client';

import * as React from 'react';

// Sellobay Service worker — production'da ro'yxatdan o'tadi.
// Yangi versiya kelganda foydalanuvchiga toast ko'rsatib, bir martalik reload qiladi.
// Bu — o'rnatilgan PWA app'lar yangilanmasligi muammosini hal qiladi.
export function ServiceWorkerRegister() {
  const [needsReload, setNeedsReload] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Bevosita yangilanishni majburlash — sahifa ochilganda har safar tekshiriladi
          reg.update().catch(() => null);

          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                // Yangi SW tayyor — foydalanuvchiga bildiramiz
                setNeedsReload(true);
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[SW] registration failed:', err);
        });

      // SW activate bo'lganda postMessage'ni eshitamiz
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATED') {
          // Yangi SW yangi versiya bilan kelishini darhol ko'rsatamiz
          setNeedsReload(true);
        }
      });

      // SW controller o'zgarsa (yangi SW kuchga kirgan) — sahifani yangilash
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const reload = React.useCallback(() => {
    // Skip waiting → controller change → reload
    navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
    // Fallback agar controllerchange ishlamasa
    setTimeout(() => window.location.reload(), 600);
  }, []);

  if (!needsReload) return null;

  // Update banner — pastdan chiqadigan toast
  return (
    <div className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 px-4">
      <div className="bg-brand-bordeaux flex items-center gap-3 rounded-full px-5 py-3 text-white shadow-2xl">
        <span className="text-sm font-medium">Yangi versiya mavjud</span>
        <button
          type="button"
          onClick={reload}
          className="text-brand-bordeaux rounded-full bg-white px-4 py-1.5 text-xs font-bold hover:bg-white/90"
        >
          Yangilash
        </button>
      </div>
    </div>
  );
}
