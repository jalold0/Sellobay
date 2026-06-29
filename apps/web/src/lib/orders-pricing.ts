// Buyurtma narx hisoblash — create va edit route'lari uchun UMUMIY.
// Bitta haqiqat manbai: yetkazib berish narxi qoidalari shu yerda.

export const SHIPPING_FEE = 20_000;
export const EXPRESS_FEE = 50_000;
export const FREE_SHIPPING_THRESHOLD = 500_000;

export type DeliveryMethod = 'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS';

/** Yetkazib berish narxi — usul va subtotal bo'yicha (so'm). */
export function shippingFor(method: DeliveryMethod, subtotal: number): number {
  if (method === 'EXPRESS') return EXPRESS_FEE;
  if (method === 'PICKUP_POINT') return 0;
  // HOME_DELIVERY — 500k+ bo'lsa tekin
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}
