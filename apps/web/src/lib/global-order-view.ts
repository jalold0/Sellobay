// Global buyurtmaning MIJOZ ko'radigan ko'rinishi.
//
// Operator ko'radigan ma'lumot (tannarx, ¥ narx, biz yutgan farq, zakaz raqami)
// mijozga CHIQMAYDI. Mijozga faqat: qaysi bosqichda, qancha kutadi, trek raqami,
// va agar narx oshgan bo'lsa — qancha qo'shimcha so'ralayotgani.

import { FREIGHT, type FreightMode } from '@ecom/core-domain';

/** Mijozga ko'rsatiladigan bosqichlar (ichki statuslar shularga yig'iladi). */
export type GlobalStage =
  | 'CHECKING' // biz Xitoydagi narx va mavjudlikni tekshiryapmiz
  | 'PRICE_CHANGED' // narx oshdi — mijoz qarori kutilyapti
  | 'CONFIRMED' // tasdiqlandi, zakaz berilmoqda
  | 'PURCHASED' // Xitoyda sotib olindi
  | 'IN_CARGO' // yo'lda
  | 'DELIVERED'
  | 'CANCELLED';

/** Kuzatuv chizig'i — mijoz qayerdaligini ko'rishi uchun. */
export const GLOBAL_TIMELINE: readonly GlobalStage[] = [
  'CHECKING',
  'CONFIRMED',
  'PURCHASED',
  'IN_CARGO',
  'DELIVERED',
];

const STATUS_TO_STAGE: Record<string, GlobalStage> = {
  NEW: 'CHECKING',
  PRICE_CHECK: 'CHECKING',
  PRICE_CHANGED: 'PRICE_CHANGED',
  CONFIRMED: 'CONFIRMED',
  PURCHASED: 'PURCHASED',
  IN_CARGO: 'IN_CARGO',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'CANCELLED',
};

export interface GlobalFulfillmentRow {
  status: string;
  freightMode: string;
  trackNumber: string | null;
  extraChargeTotal: { toString(): string } | null;
  varianceDecision: string | null;
  purchasedAt: Date | null;
  cargoRegisteredAt: Date | null;
  deliveredAt: Date | null;
}

export interface CustomerGlobalView {
  stage: GlobalStage;
  /** GLOBAL_TIMELINE ichidagi o'rni; -1 = chiziqdan tashqarida (narx o'zgardi / bekor). */
  stageIndex: number;
  freightMode: FreightMode;
  leadTimeDays: readonly [number, number];
  trackNumber: string | null;
  /** Mijozdan qaror kutilyaptimi (narx oshgan). */
  needsDecision: boolean;
  /** Qo'shimcha so'ralayotgan summa (so'm) — faqat narx oshganda. */
  extraChargeUzs: number | null;
  purchasedAt: string | null;
  cargoRegisteredAt: string | null;
  deliveredAt: string | null;
}

export function toCustomerGlobalView(f: GlobalFulfillmentRow): CustomerGlobalView {
  const stage = STATUS_TO_STAGE[f.status] ?? 'CHECKING';
  const mode = (f.freightMode === 'AVIA' ? 'AVIA' : 'AUTO') as FreightMode;
  const extra = f.extraChargeTotal === null ? null : Number(f.extraChargeTotal.toString());

  return {
    stage,
    stageIndex: GLOBAL_TIMELINE.indexOf(stage),
    freightMode: mode,
    leadTimeDays: FREIGHT[mode].leadTimeDays,
    // Trek raqam faqat kargoga topshirilgach ko'rsatiladi
    trackNumber: f.status === 'IN_CARGO' || f.status === 'DELIVERED' ? f.trackNumber : null,
    needsDecision: stage === 'PRICE_CHANGED',
    extraChargeUzs: stage === 'PRICE_CHANGED' && extra && extra > 0 ? extra : null,
    purchasedAt: f.purchasedAt?.toISOString() ?? null,
    cargoRegisteredAt: f.cargoRegisteredAt?.toISOString() ?? null,
    deliveredAt: f.deliveredAt?.toISOString() ?? null,
  };
}

/** Prisma select — list va detail bir xil maydonlarni olishi uchun. */
export const globalFulfillmentSelect = {
  status: true,
  freightMode: true,
  trackNumber: true,
  extraChargeTotal: true,
  varianceDecision: true,
  purchasedAt: true,
  cargoRegisteredAt: true,
  deliveredAt: true,
} as const;
