import * as Sentry from '@sentry/nextjs';

/**
 * Xato kuzatuvi — brauzer tomoni.
 *
 * DIQQAT — bu fayl ATAYLAB `sentry.client.config.ts` deb nomlangan.
 * Sentry build paytida uni `instrumentation-client.ts` ga ko'chirishni tavsiya
 * qilib ogohlantiradi, LEKIN u fayl Next.js 15.3+ imkoniyati. Loyiha Next 14.2
 * da va u bunday faylni umuman bilmaydi — ko'chirsangiz brauzerda Sentry jim
 * bo'lib qoladi. Next 15 ga o'tganda ko'chirish kerak.
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
