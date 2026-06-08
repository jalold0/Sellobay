'use client';

import * as React from 'react';

// Service worker'ni faqat production'da ro'yxatdan o'tkazadi.
// Auto-update — yangi versiya kelganda foydalanuvchi xabardor qilinmaydi (silent reload).
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // Yangi versiya topilsa — quietly update
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing;
            if (!installing) return;
            installing.addEventListener('statechange', () => {
              if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                // Yangi SW tayyor — qayta yuklash uchun:
                // window.location.reload();
                // Hozir avtomatik yuklamaymiz — keyingi navigatsiyada faollashadi.
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[SW] registration failed:', err);
        });
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
