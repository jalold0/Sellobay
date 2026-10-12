// Admin fulfillment — buyurtma statusini qo'lda oldinga surish qoidalari.
//
// Server (admin status route) ham, admin UI ham shu funksiyalardan o'qiydi:
// ko'rsatilgan tugmalar va server tekshiruvi bir-biridan farq qilmaydi.
//
// Asosiy qoida — status pulni "yarata" olmaydi:
//   • PAID hech qachon qo'lda qo'yilmaydi. Uni faqat to'lov oqimlari qo'yadi
//     (Click/Payme webhook, UZCARD chek tasdig'i, naqd — yetkazilganda);
//   • oldindan to'lanadigan buyurtma (Click/Payme/UZCARD…) pul tushmaguncha
//     CONFIRMED'dan nariga o'tmaydi — to'lanmagan tovar jo'natilmaydi;
//   • naqd (COD) to'lov faqat DELIVERED o'tishida "olindi" deb hisoblanadi.

/** Oldinga yo'nalish tartibi. CANCELLED/RETURNED/REFUNDED bu oqimga kirmaydi. */
export const FULFILLMENT_FLOW = [
  'PENDING',
  'CONFIRMED',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_FLOW)[number];

/** Naqd to'lov provayderi (Prisma `PaymentProvider.CASH_ON_DELIVERY`). */
export const COD_PROVIDER = 'CASH_ON_DELIVERY' as const;

/**
 * Buyurtmaning to'lov holati fulfillment nuqtai nazaridan:
 *  - PAID — pul tushgan;
 *  - COD_PENDING — naqd, yetkazilganda olinadi;
 *  - AWAITING_PAYMENT — oldindan to'lanadigan va pul hali tushmagan.
 */
export type OrderPaymentState = 'PAID' | 'COD_PENDING' | 'AWAITING_PAYMENT';

export interface PaymentSnapshot {
  provider: string;
  status: string;
}

/**
 * To'lov holatini buyurtma va uning to'lov yozuvlaridan aniqlaydi.
 * Buyurtmada to'lov usuli maydoni yo'q: naqd va UZCARD'da yozuv buyurtma
 * yaratilganda PENDING bo'lib ochiladi, Click/Payme'da esa faqat webhook'da.
 */
export function orderPaymentState(input: {
  paidAt: Date | string | null;
  payments: readonly PaymentSnapshot[];
}): OrderPaymentState {
  if (input.paidAt || input.payments.some((p) => p.status === 'PAID')) return 'PAID';
  if (input.payments.some((p) => p.provider === COD_PROVIDER && p.status === 'PENDING')) {
    return 'COD_PENDING';
  }
  return 'AWAITING_PAYMENT';
}

/** Admin `current` statusdan qo'ya oladigan statuslar (bo'sh — o'zgartirib bo'lmaydi). */
export function adminFulfillmentTargets(
  current: string,
  payment: OrderPaymentState,
): FulfillmentStatus[] {
  const i = FULFILLMENT_FLOW.indexOf(current as FulfillmentStatus);
  if (i === -1) return [];
  const forward = FULFILLMENT_FLOW.slice(i + 1).filter((s) => s !== 'PAID');
  return payment === 'AWAITING_PAYMENT' ? forward.filter((s) => s === 'CONFIRMED') : forward;
}

export function canAdminTransition(
  current: string,
  next: string,
  payment: OrderPaymentState,
): boolean {
  return adminFulfillmentTargets(current, payment).includes(next as FulfillmentStatus);
}

/**
 * Admin bekor qila oladigan holatlar — tovar hali omborda (jo'natilmagan). SHIPPED va undan
 * keyin tovar kuryer/mijozda: u qaytarish oqimi orqali qaytadi, bekor qilish orqali emas.
 */
export const ADMIN_CANCELLABLE_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PAID',
  'PROCESSING',
  'PACKED',
] as const;

export function canAdminCancel(status: string): boolean {
  return (ADMIN_CANCELLABLE_STATUSES as readonly string[]).includes(status);
}

/** Shu o'tishda naqd to'lov olindi deb yoziladimi (faqat COD va faqat DELIVERED'da). */
export function settlesCodPayment(next: string, payment: OrderPaymentState): boolean {
  return next === 'DELIVERED' && payment === 'COD_PENDING';
}

/**
 * Mijoz yangi karta chekini yubora oladimi (audit O4). Ilgari chek rad etilsa buyurtma
 * PENDING'da qotardi — qayta yuborishning yo'li yo'q edi, K4 esa 24 soatdan keyin bekor qilardi.
 * `payments` — eng yangisi birinchi.
 */
export function canResubmitReceipt(input: {
  status: string;
  paidAt: Date | string | null;
  payments: readonly PaymentSnapshot[];
}): boolean {
  if (input.status !== 'PENDING' && input.status !== 'CONFIRMED') return false;
  if (input.paidAt) return false;
  if (input.payments.some((p) => p.status === 'PENDING' || p.status === 'PAID')) return false;
  const latest = input.payments[0];
  return latest?.provider === 'UZCARD' && latest.status === 'FAILED';
}
