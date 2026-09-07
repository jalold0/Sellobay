// Yetkazib berish narxi — BITTA HAQIQAT MANBAI (web create/edit route'lari + mobil).
// Sof funksiya: framework/DB'ga bog'liq emas.

export const SHIPPING_FEE = 20_000;
export const EXPRESS_FEE = 50_000;
export const FREE_SHIPPING_THRESHOLD = 500_000;

/**
 * Qaytarish muddati — yetkazib berilgandan keyin necha kun ichida mijoz
 * buyurtmani qaytara oladi (qonuniy asos).
 *
 * Ilgari bu son faqat `/api/orders/[id]/return` ichida lokal const edi va
 * mijozga ko'rinadigan «Qaytarish» sahifasida umuman aytilmasdi — ya'ni
 * foydalanuvchi o'zida bor huquqni bilmasdi.
 */
export const RETURN_WINDOW_DAYS = 14;

export type DeliveryMethod = 'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS';

/** Yetkazib berish narxi — usul va subtotal bo'yicha (so'm). */
export function shippingFor(method: DeliveryMethod, subtotal: number): number {
  if (method === 'EXPRESS') return EXPRESS_FEE;
  if (method === 'PICKUP_POINT') return 0;
  // HOME_DELIVERY — 500k+ bo'lsa tekin
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}
