import * as Sentry from '@sentry/nextjs';

/**
 * Xato kuzatuvi — brauzer tomoni.
 *
 * DSN client bundle'ga tushishi kerak, shuning uchun NEXT_PUBLIC_ prefiksi.
 * Qo'yilmagan bo'lsa Sentry ishga tushmaydi.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    // Shaxsiy ma'lumot yubormaymiz — checkout formasida telefon va manzil bor.
    sendDefaultPii: false,
    // Session replay ataylab yoqilmagan: to'lov cheki va manzil ekranga
    // yozilishi mumkin. Kerak bo'lsa maskalash sozlab yoqiladi.
  });
}
