// Sentry'ni brauzerda KECHIKTIRIB yuklash.
//
// NEGA: `@sentry/nextjs` brauzer SDK'si ~220 KB (62 KB gzip) va u xato chegarasi
// (`error.tsx`) orqali har bir sahifaning birinchi yuklanishiga tushardi. Lighthouse'da
// (mobil, 4× sekin CPU) shu bitta bo'lak ~2,5 s skript vaqtini olardi — DSN sozlanmagan
// lokal build'da ham, ya'ni xarajat SDK modullarini bajarishning o'zida edi.
//
// Endi SDK alohida bo'lakda: brauzer bo'sh bo'lganda (requestIdleCallback) yoki birinchi
// xato ushlanganda yuklanadi. Kelishuv: sahifa ochilgandan keyingi birinchi soniyalarda
// ushlanmagan GLOBAL xato Sentry'ga tushmasligi mumkin; xato chegaralari ushlagan xatolar
// esa `captureExceptionLazy` orqali baribir yuboriladi.

import type * as SentryNs from '@sentry/nextjs';

type SentryModule = typeof SentryNs;

let loading: Promise<SentryModule | null> | null = null;

/** SDK'ni bir marta yuklaydi va DSN bo'lsa ishga tushiradi. DSN yo'q — null. */
export function loadSentry(): Promise<SentryModule | null> {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn || typeof window === 'undefined') return Promise.resolve(null);
  // `webpackExports` — faqat shu ikki eksport. Usiz `import()` butun namespace'ni oladi va
  // webpack Session Replay'ni (rrweb, ~100 KB) ham alohida bo'lak qilib birga yuklardi —
  // replay ishlatilmasa ham (next.config.mjs: excludeReplay* faqat iframe/worker'ni oladi).
  loading ??= import(/* webpackExports: ["init", "captureException"] */ '@sentry/nextjs')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
        // Brauzerda tracing yo'q (next.config.mjs: __SENTRY_TRACING__ = false) — faqat xatolar.
        // Shaxsiy ma'lumot yubormaymiz — checkout formasida telefon va manzil bor.
        sendDefaultPii: false,
        // Session replay ataylab yoqilmagan: to'lov cheki va manzil ekranga
        // yozilishi mumkin. Kerak bo'lsa maskalash sozlab yoqiladi.
      });
      return Sentry;
    })
    .catch(() => {
      // SDK yuklanmadi (tarmoq) — keyingi xatoda qayta urinamiz; sahifa ishlayveradi.
      loading = null;
      return null;
    });
  return loading;
}

/** Brauzer bo'sh bo'lganda yuklash (sahifa yuklanishi bilan raqobat qilmaydi). */
export function loadSentryWhenIdle(): void {
  if (typeof window === 'undefined') return;
  const start = () => void loadSentry();
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 8000 });
  } else {
    setTimeout(start, 4000);
  }
}

/** Xato chegaralari uchun: SDK hali yuklanmagan bo'lsa, yuklab keyin yuboradi. */
export function captureExceptionLazy(error: unknown): void {
  void loadSentry().then((Sentry) => Sentry?.captureException(error));
}
