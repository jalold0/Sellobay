// To'lanmagan buyurtmani avtomatik bekor qilish qoidasi (audit K4).
//
// Oldindan to'lanadigan buyurtma (Click/Payme/karta) yaratilganda zaxira darhol kamayadi.
// Mijoz to'lamasa, tovar abadiy band qolardi — boshqa xaridor sotib ololmasdi.
//
// Qoida:
//   • faqat PENDING/CONFIRMED, pul tushmagan (AWAITING_PAYMENT) buyurtma;
//   • jarayondagi to'lov bo'lsa (PENDING yozuv) — tegilmaydi: karta cheki admin tekshiruvida,
//     Payme tranzaksiyasi ochiq (uni Payme o'zi bekor qiladi), naqd — yetkazilganda;
//   • Click/Payme: buyurtmadan 12 soat;
//   • karta cheki rad etilgan bo'lsa: rad etilgandan 24 soat (qayta chek yuborishga vaqt).

import { orderPaymentState, type PaymentSnapshot } from './order-fulfillment.ts';

export const UNPAID_ORDER_TTL_HOURS = 12;
export const REJECTED_RECEIPT_TTL_HOURS = 24;

/** Avtomatik bekor qilinishi mumkin bo'lgan holatlar (tovar hali omborda). */
export const EXPIRABLE_ORDER_STATUSES = ['PENDING', 'CONFIRMED'] as const;

const HOUR_MS = 60 * 60 * 1000;

export interface ExpiryPaymentSnapshot extends PaymentSnapshot {
  failedAt?: Date | string | null;
}

export interface ExpiryInput {
  status: string;
  placedAt: Date | string;
  paidAt: Date | string | null;
  payments: readonly ExpiryPaymentSnapshot[];
}

/** Buyurtma qachon muddati o'tgan hisoblanadi (`null` — avtomatik bekor qilinmaydi). */
export function unpaidOrderDeadline(input: ExpiryInput): Date | null {
  if (!(EXPIRABLE_ORDER_STATUSES as readonly string[]).includes(input.status)) return null;
  if (orderPaymentState(input) !== 'AWAITING_PAYMENT') return null;
  if (input.payments.some((p) => p.status === 'PENDING')) return null;

  const placed = new Date(input.placedAt).getTime();
  const rejectedAt = input.payments
    .filter((p) => p.status === 'FAILED' && p.failedAt)
    .map((p) => new Date(p.failedAt as Date | string).getTime())
    .reduce((a, b) => Math.max(a, b), 0);

  const byPlaced = placed + UNPAID_ORDER_TTL_HOURS * HOUR_MS;
  const byRejected = rejectedAt > 0 ? rejectedAt + REJECTED_RECEIPT_TTL_HOURS * HOUR_MS : 0;
  return new Date(Math.max(byPlaced, byRejected));
}

export function isUnpaidOrderExpired(input: ExpiryInput, now: Date = new Date()): boolean {
  const deadline = unpaidOrderDeadline(input);
  return deadline !== null && deadline.getTime() <= now.getTime();
}
