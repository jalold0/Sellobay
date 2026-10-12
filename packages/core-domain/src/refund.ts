// Pulni qaytarish qoidalari (audit K5).
//
// Bekor qilingan yoki qaytarilgan to'langan buyurtmada pul mijozga qaytishi kerak, lekin
// ilgari buni qayd etishning yo'li yo'q edi: `refundedTotal` doim 0, buyurtma RETURNED'da
// qotib qolardi. Pul gateway kabinetida (Click/Payme) yoki naqd/karta orqali QO'LDA
// qaytariladi, bu yerda faqat qayd etiladi — avtomatik gateway refund keyingi bosqich.
//
// Pul float'siz: tiyin (bigint) bilan hisoblanadi, natija o'nlik satr ("125000.50").

export const REFUNDABLE_ORDER_STATUSES = ['CANCELLED', 'RETURNED'] as const;

/** "125000.5" / "125000.50" / "125000" → tiyin (bigint). Noto'g'ri qiymat — 0. */
export function moneyToCents(value: string): bigint {
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!m) return 0n;
  return BigInt(m[1]!) * 100n + BigInt((m[2] ?? '').padEnd(2, '0'));
}

export function centsToMoney(cents: bigint): string {
  const neg = cents < 0n;
  const abs = neg ? -cents : cents;
  const s = `${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
  return neg ? `-${s}` : s;
}

export interface RefundableOrder {
  status: string;
  paidAt: Date | string | null;
  /** Haqiqatda tushgan summa; ba'zi to'lov yo'llari to'ldirmaydi (0) — unda grandTotal. */
  paidTotal: string;
  grandTotal: string;
  refundedTotal: string;
}

/** Hali qaytarilishi kerak bo'lgan summa (o'nlik satr); qaytarib bo'lmasa "0.00". */
export function refundRemaining(order: RefundableOrder): string {
  if (!order.paidAt) return '0.00';
  if (!(REFUNDABLE_ORDER_STATUSES as readonly string[]).includes(order.status)) return '0.00';
  const paid = moneyToCents(order.paidTotal);
  const base = paid > 0n ? paid : moneyToCents(order.grandTotal);
  const left = base - moneyToCents(order.refundedTotal);
  return centsToMoney(left > 0n ? left : 0n);
}

export type RefundDecision =
  | { ok: true; newRefundedTotal: string; fullyRefunded: boolean }
  | {
      ok: false;
      code: 'NOT_REFUNDABLE' | 'INVALID_AMOUNT' | 'EXCEEDS_REMAINING';
      remaining: string;
    };

/** `amount` qaytarilsa nima bo'ladi: yangi `refundedTotal` va to'liq qaytdimi. */
export function decideRefund(order: RefundableOrder, amount: string): RefundDecision {
  const remaining = refundRemaining(order);
  const left = moneyToCents(remaining);
  if (left === 0n) return { ok: false, code: 'NOT_REFUNDABLE', remaining };
  const cents = moneyToCents(amount);
  if (cents <= 0n) return { ok: false, code: 'INVALID_AMOUNT', remaining };
  if (cents > left) return { ok: false, code: 'EXCEEDS_REMAINING', remaining };
  return {
    ok: true,
    newRefundedTotal: centsToMoney(moneyToCents(order.refundedTotal) + cents),
    fullyRefunded: cents === left,
  };
}
