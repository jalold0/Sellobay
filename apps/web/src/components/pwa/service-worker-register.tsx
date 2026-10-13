'use client';

import * as React from 'react';

// Sellobay Service worker — production'da ro'yxatdan o'tadi.
// Yangi versiya kelganda foydalanuvchiga toast ko'rsatib, bir martalik reload qiladi.
// Bu — o'rnatilgan PWA app'lar yangilanmasligi muammosini hal qiladi.
export function ServiceWorkerRegister() {
  const [needsReload, setNeedsReload] = React.useState(false);
  const regRef = React.useRef<ServiceWorkerRegistration | null>(null);
  // Sahifa faqat foydalanuvchi «Yangilash»ni bosganda qayta yuklanadi.
  const userAskedRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    // Birinchi tashrifda SW sahifani nazoratga olganda ham `controllerchange` keladi.
    // Ilgari shunda sahifa so'zsiz qayta yuklanardi: har yangi mijoz ochilgandan 1–3 s
    // keyin sahifa sakrab, scroll boshiga qaytardi.
    const onControllerChange = () => {
      if (!userAskedRef.current) return;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_UPDATED') setNeedsReload(true);
    };
    navigator.serviceWorker.addEventListener('message', onMessage);

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          regRef.current = reg;
          // Eski tabda kutib turgan yangi versiya bo'lsa — darhol taklif qilamiz
          if (reg.waiting && navigator.serviceWorker.controller) setNeedsReload(true);
          reg.update().catch(() => null);

          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                // Yangi SW tayyor va kutyapti — foydalanuvchiga bildiramiz
                setNeedsReload(true);
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[SW] registration failed:', err);
        });
    };

    // `load` gidratsiyadan oldin o'tib ketgan bo'lsa, tinglovchi hech qachon ishlamasdi.
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });

    return () => {
      window.removeEventListener('load', register);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);

  const reload = React.useCallback(() => {
    userAskedRef.current = true;
    const waiting = regRef.current?.waiting;
    if (waiting) {
      // Kutib turgan YANGI SW'ga — u kuchga kiradi → controllerchange → reload
      waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      window.location.reload();
    }
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
