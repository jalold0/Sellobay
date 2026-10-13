// 3PL (oxirgi masofa) holatlari — ADR 0015.
//
// Provayder (hozircha «qo'lda»: admin belgilaydi; keyin Fargo/BTS webhook'i) bizga hodisa
// beradi, biz uni buyurtma va yetkazish holatiga o'giramiz. Qoidalar bitta joyda — admin
// tugmalari ham, kelajakdagi webhook ham shu jadvaldan o'qiydi.

export type CarrierEvent = 'HANDED_OVER' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'REFUSED';

export interface CarrierEventRule {
  /** Buyurtma qaysi holatlardan bu hodisani qabul qiladi. */
  from: readonly string[];
  /** Buyurtmaning yangi holati. */
  order: 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'RETURNED';
  /** Yetkazish (`Delivery`) yozuvining yangi holati. */
  delivery: 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'FAILED';
}

export const CARRIER_EVENT_RULES: Record<CarrierEvent, CarrierEventRule> = {
  // Hamma tovar omborda yig'ilgan (PACKED) — 3PL olib ketdi.
  HANDED_OVER: { from: ['PACKED'], order: 'SHIPPED', delivery: 'PICKED_UP' },
  // Kuryer yo'lda yoki viloyat filialida (punktda) — mijoz olishi mumkin.
  OUT_FOR_DELIVERY: { from: ['SHIPPED'], order: 'OUT_FOR_DELIVERY', delivery: 'IN_TRANSIT' },
  DELIVERED: { from: ['SHIPPED', 'OUT_FOR_DELIVERY'], order: 'DELIVERED', delivery: 'DELIVERED' },
  // Mijoz topshirishda tekshirib rad etdi — tovar omborga qaytadi (zaxira kelganda tiklanadi).
  REFUSED: { from: ['SHIPPED', 'OUT_FOR_DELIVERY'], order: 'RETURNED', delivery: 'FAILED' },
};

/** 3PL'ga topshirilgandan keyingi hodisalar (topshirishning o'zi alohida — trek raqami bilan). */
const AFTER_HANDOVER: CarrierEvent[] = ['OUT_FOR_DELIVERY', 'DELIVERED', 'REFUSED'];

/** Buyurtmaning hozirgi holatida mumkin bo'lgan 3PL hodisalari. */
export function carrierEventsFor(orderStatus: string, handedToCarrier: boolean): CarrierEvent[] {
  if (!handedToCarrier) {
    return CARRIER_EVENT_RULES.HANDED_OVER.from.includes(orderStatus) ? ['HANDED_OVER'] : [];
  }
  return AFTER_HANDOVER.filter((e) => CARRIER_EVENT_RULES[e].from.includes(orderStatus));
}

/** Trek raqami: harf, raqam va «-», 4–40 belgi. */
export function isValidTrackingNumber(value: string): boolean {
  return /^[A-Za-z0-9-]{4,40}$/.test(value.trim());
}
