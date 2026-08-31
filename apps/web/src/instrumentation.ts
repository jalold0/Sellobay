import * as Sentry from '@sentry/nextjs';

/**
 * Xato kuzatuvi — server va edge runtime uchun.
 *
 * SENTRY_DSN qo'yilmagan bo'lsa Sentry umuman ishga tushmaydi: tarmoqqa
 * so'rov ketmaydi, qo'shimcha yuk bo'lmaydi. Shuning uchun bu kod DSN
 * olinmagunicha ham xavfsiz turaveradi.
 */
export async function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  const common = {
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    // Tranzaksiyalarning 10%i — bepul kvotani tejash uchun. Xatolar 100% yuboriladi.
    tracesSampleRate: 0.1,
    // Shaxsiy ma'lumot yubormaymiz: telefon, manzil, to'lov cheki xato
    // kontekstiga tushib qolmasin.
    sendDefaultPii: false,
  };

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init(common);
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init(common);
  }
}

/** Server komponentlari va route handler'laridagi xatolarni ushlaydi. */
export const onRequestError = Sentry.captureRequestError;
