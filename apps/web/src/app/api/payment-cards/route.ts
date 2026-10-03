// GET /api/payment-cards — checkout uchun to'lov imkoniyatlari.
//
// Ikki narsani qaytaradi:
//   • `cards`     — platforma kartalari (qo'lda karta to'lovi uchun);
//   • `providers` — hozir ISHLAYDIGAN to'lov usullari.
//
// NEGA `providers` SHU YERDA, `/api/config` da emas: `/api/config`
// prerender qilinadi (statik), ya'ni `process.env` undan BUILD vaqtida
// o'qiladi va deploy muhitidagi kalitlar ko'rinmay qolardi. Bu route esa
// `force-dynamic` — har so'rovda qayta hisoblanadi.
//
// Sozlanmagan provayder ro'yxatga tushmaydi: kalitsiz `buildClickUrl`
// baribir manzil quradi, lekin `service_id` bo'sh bo'lib, mijoz buzuq
// to'lov sahifasiga tushadi.

import { apiOk } from '@/lib/auth/errors';
import { getPaymentCards } from '@/lib/manual-payment';
import { availableProviders } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return apiOk({ cards: getPaymentCards(), providers: availableProviders() });
}
