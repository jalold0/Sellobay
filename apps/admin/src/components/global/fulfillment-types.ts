// Global zayavka (GlobalFulfillment) — admin UI tiplari va yorliqlari.

export type FulfillmentStatus =
  | 'NEW'
  | 'PRICE_CHECK'
  | 'PRICE_CHANGED'
  | 'CONFIRMED'
  | 'PURCHASED'
  | 'IN_CARGO'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export const FULFILLMENT_STATUS_LABEL: Record<string, string> = {
  NEW: 'Yangi',
  PRICE_CHECK: 'Tekshirilmoqda',
  PRICE_CHANGED: 'Narx o‘zgardi',
  CONFIRMED: 'Tasdiqlandi',
  PURCHASED: 'Sotib olindi',
  IN_CARGO: 'Kargoda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
  REFUNDED: 'Pul qaytarildi',
};

export const VARIANCE_LABEL: Record<string, string> = {
  AUTO_CONFIRM: 'Farq chidam ichida — tasdiqlandi',
  ASK_CUSTOMER: 'Narx oshdi — mijoz bilan kelishish kerak',
  CANCEL_SUGGESTED: 'Farq juda katta — bekor qilish tavsiya etiladi',
};

export interface FulfillmentLine {
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sourceUrl: string | null;
  platform: string | null;
  priceCny: number | null;
}

export interface FulfillmentView {
  id: string;
  status: FulfillmentStatus;
  freightMode: 'AUTO' | 'AVIA';
  paidTotal: number;
  verifiedPriceCny: number | null;
  verifiedTotal: number | null;
  varianceDecision: string | null;
  absorbedTotal: number | null;
  extraChargeTotal: number | null;
  verifiedAt: string | null;
  purchaseRef: string | null;
  trackNumber: string | null;
  actualWeightKg: number | null;
  cargoRegisteredAt: string | null;
  purchasedAt: string | null;
  deliveredAt: string | null;
  operatorNote: string | null;
  createdAt: string;
  order: {
    id: string;
    number: string;
    status: string;
    /** Pul haqiqatan kelganmi (Order.paidAt). Sotib olish shu shartga bog'liq. */
    paid: boolean;
    paidAt: string | null;
    grandTotal: number;
    placedAt: string;
    customer: string | null;
    phone: string | null;
    address: string | null;
    recipient: string | null;
  };
  items: FulfillmentLine[];
  variance?: {
    decision: string;
    diffUzs: number;
    diffPct: number;
    absorbedUzs: number;
    extraChargeUzs: number;
  };
}
