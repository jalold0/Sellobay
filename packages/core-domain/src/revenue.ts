// Daromad ta'rifi — admin bosh sahifasi, admin analitikasi, seller dashboard va seller
// analitikasi BIR XIL qoidani ishlatadi (audit O2: ilgari to'rt joyda to'rt xil hisoblanardi).
//
// Daromad = pul TUSHGAN (`paidAt` bor) va bekor/qaytarilmagan buyurtma. Sana — `paidAt`
// (pul tushgan kun). `paidAt` ni to'lovning barcha yo'llari to'ldiradi: Click, Payme, chek
// tasdig'i, yetkazishda naqd. Status ro'yxatiga tayanilmaydi: CONFIRMED/PACKED kabi oraliq
// holatlar ro'yxatdan tushib qolardi.

export const NON_REVENUE_ORDER_STATUSES = ['CANCELLED', 'RETURNED', 'REFUNDED'] as const;

export function countsAsRevenue(order: { paidAt: Date | string | null; status: string }): boolean {
  return (
    order.paidAt !== null &&
    !(NON_REVENUE_ORDER_STATUSES as readonly string[]).includes(order.status)
  );
}
