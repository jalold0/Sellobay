// Marketplace sozlamalari va sotuvchi hisob-kitobi (ADR 0015).
//
// FBS — sotuvchi qadoqlab omborga olib keladi; FBO — tovar bizning omborda, biz yig'amiz.
// Komissiya va har dona uchun xizmat haqi modelga qarab farq qiladi. Raqamlar bazada
// (`GlobalSetting`, id = 'marketplace') — admin deploy'siz o'zgartiradi; bu yerda standart va
// xavfsiz birlashtirish (buzuq qiymat standartga qaytadi).
//
// Pul float'siz: tiyin (bigint), natija o'nlik satr.

import { centsToMoney, moneyToCents } from './refund.ts';
import { tashkentDayStart, TASHKENT_OFFSET_MS } from './tashkent-time.ts';

export type FulfillmentModelKey = 'FBS' | 'FBO';
export const FULFILLMENT_MODELS: readonly FulfillmentModelKey[] = ['FBS', 'FBO'];

export interface MarketplaceSettings {
  /** Komissiya, % (sotuv summasidan). */
  commissionPct: Record<FulfillmentModelKey, number>;
  /** Har dona uchun xizmat haqi, so'm (FBO: saqlash + yig'ish + qadoqlash; FBS: qabul). */
  feePerUnit: Record<FulfillmentModelKey, number>;
  /** FBS: sotuvchi omborga topshirish muddati; FBO: ombor yig'ish muddati (soat). */
  handoverHours: Record<FulfillmentModelKey, number>;
  /** Oyning qaysi kunlari sotuvchiga to'lanadi. */
  payoutDays: number[];
}

/**
 * BOSHLANG'ICH qiymatlar — haqiqiy tariflar admin «Marketplace sozlamalari»da belgilanadi.
 * FBS topshirish muddati 48 soat (Uzum FBS bilan bir xil), to'lov oyiga 2 marta.
 */
export const DEFAULT_MARKETPLACE_SETTINGS: MarketplaceSettings = {
  commissionPct: { FBS: 10, FBO: 12 },
  feePerUnit: { FBS: 0, FBO: 5000 },
  handoverHours: { FBS: 48, FBO: 24 },
  payoutDays: [1, 16],
};

function num(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (value < min || value > max) return fallback;
  return value;
}

function perModel(
  over: unknown,
  base: Record<FulfillmentModelKey, number>,
  min: number,
  max: number,
): Record<FulfillmentModelKey, number> {
  const o = over && typeof over === 'object' ? (over as Record<string, unknown>) : {};
  return { FBS: num(o.FBS, base.FBS, min, max), FBO: num(o.FBO, base.FBO, min, max) };
}

/** Bazadagi farqlarni standart ustiga qo'yadi. Noto'g'ri qiymat — standart qoladi. */
export function resolveMarketplaceSettings(override: unknown): MarketplaceSettings {
  const o = override && typeof override === 'object' ? (override as Record<string, unknown>) : {};
  const d = DEFAULT_MARKETPLACE_SETTINGS;
  const days = Array.isArray(o.payoutDays)
    ? [
        ...new Set(
          o.payoutDays.filter((x): x is number => Number.isInteger(x) && x >= 1 && x <= 28),
        ),
      ].sort((a, b) => a - b)
    : [];
  return {
    commissionPct: perModel(o.commissionPct, d.commissionPct, 0, 100),
    feePerUnit: perModel(o.feePerUnit, d.feePerUnit, 0, 10_000_000),
    handoverHours: perModel(o.handoverHours, d.handoverHours, 1, 24 * 14),
    payoutDays: days.length > 0 ? days : d.payoutDays,
  };
}

export interface ItemSettlement {
  /** Sotuv summasi (+ sotuvchiga). */
  sale: string;
  /** Komissiya (− sotuvchidan). */
  commission: string;
  /** Xizmat haqi (− sotuvchidan). */
  fee: string;
  /** Sotuvchiga qoladi. */
  net: string;
}

/** Bitta buyurtma satri bo'yicha hisob (yetkazilgan paytda yoziladi). Komissiya tiyingacha yaxlitlanadi. */
export function settleItem(
  totalPrice: string,
  quantity: number,
  model: FulfillmentModelKey,
  settings: MarketplaceSettings,
): ItemSettlement {
  const sale = moneyToCents(totalPrice);
  // Foiz 2 kasrgacha: pct*100 butun songa — float xatosisiz.
  const pctBp = BigInt(Math.round(settings.commissionPct[model] * 100)); // basis point
  const commission = (sale * pctBp + 5000n) / 10000n; // yarmidan yuqoriga yaxlitlash
  const fee = BigInt(Math.round(settings.feePerUnit[model])) * 100n * BigInt(Math.max(0, quantity));
  return {
    sale: centsToMoney(sale),
    commission: centsToMoney(commission),
    fee: centsToMoney(fee),
    net: centsToMoney(sale - commission - fee),
  };
}

/** Sotuvchi jo'natmasi topshirish muddati. */
export function shipmentDeadline(
  model: FulfillmentModelKey,
  settings: MarketplaceSettings,
  from: Date,
): Date {
  return new Date(from.getTime() + settings.handoverHours[model] * 60 * 60 * 1000);
}

/** Keyingi to'lov kuni (Toshkent kuni boshlanishi, UTC `Date`). Bugun to'lov kuni bo'lsa — bugun. */
export function nextPayoutDate(now: Date, payoutDays: number[]): Date {
  const today = tashkentDayStart(now);
  const local = new Date(today.getTime() + TASHKENT_OFFSET_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  const days = [...payoutDays].sort((a, b) => a - b);
  const day = days.find((x) => x >= d);
  const target = day !== undefined ? Date.UTC(y, m, day) : Date.UTC(y, m + 1, days[0]!);
  return new Date(target - TASHKENT_OFFSET_MS);
}

/** Bugun to'lov kunimi (cron shunga qarab ishlaydi). */
export function isPayoutDay(now: Date, payoutDays: number[]): boolean {
  return nextPayoutDate(now, payoutDays).getTime() === tashkentDayStart(now).getTime();
}
