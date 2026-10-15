import { loadSentryWhenIdle } from './src/lib/sentry-lazy';

/**
 * Xato kuzatuvi — brauzer tomoni.
 *
 * DIQQAT — bu fayl ATAYLAB `sentry.client.config.ts` deb nomlangan.
 * Sentry build paytida uni `instrumentation-client.ts` ga ko'chirishni tavsiya
 * qilib ogohlantiradi, LEKIN u fayl Next.js 15.3+ imkoniyati. Loyiha Next 14.2
 * da va u bunday faylni umuman bilmaydi — ko'chirsangiz brauzerda Sentry jim
 * bo'lib qoladi. Next 15 ga o'tganda ko'chirish kerak.
 *
 * SDK bu yerda import QILINMAYDI: u ~220 KB va har sahifaning birinchi yuklanishida
 * mobil telefonda ~2,5 s CPU olardi. `loadSentryWhenIdle` uni brauzer bo'sh bo'lganda
 * alohida bo'lakdan yuklaydi va ishga tushiradi (qarang `src/lib/sentry-lazy.ts`).
 * DSN (`NEXT_PUBLIC_SENTRY_DSN`) qo'yilmagan bo'lsa umuman yuklanmaydi.
 */
loadSentryWhenIdle();
