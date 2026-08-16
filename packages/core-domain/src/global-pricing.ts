// Global (Xitoy → O'zbekiston) narx dvigateli — BITTA HAQIQAT MANBAI.
// Sof funksiya: framework/DB/HTTP'ga bog'liq emas. Web ham, mobil ham, admin ham shu yerdan hisoblaydi.
//
// NEGA KERAK: Taobao'dagi ¥ narx yakuniy narxning yarmiga ham yetmaydi. Qolgani —
// Xitoy ichki dostavkasi, agent haqi, xalqaro yuk (kg/hajm), boj, to'lov komissiyasi,
// kurs zaxirasi va marja. Bu formuladan chetga chiqilgan har bir joy — zarar.
//
// MUHIM: bu qatlam `number` bilan ishlaydi (sof hisob). Bazaga yozishda pul har doim
// Decimal/string'ga o'tkaziladi — CLAUDE.md domen qoidasi.

/** Yuk turi — kargo sherigining ikki alohida sklad manzili bor. */
export type FreightMode = 'AUTO' | 'AVIA';

export interface FreightTariff {
  /** Bitta buyurtma (dona) uchun kg narxi, USD. */
  usdPerKg: number;
  /** Seriya (partiya) tarifi, USD/kg. Yo'q bo'lsa — asosiy tarif ishlatiladi. */
  seriesUsdPerKg?: number;
  /** Seriya tarifi yoqiladigan minimal dona soni. */
  seriesMinQty?: number;
  /** Hisob-kitobga olinadigan minimal og'irlik (kg) — kargo yaxlitlashi. */
  minChargeableKg: number;
  /** Hajmiy og'irlik bo'luvchisi: (uz×en×bal sm) / divisor = kg. */
  volumetricDivisor: number;
  /** Yetkazish muddati (kun): [min, max] — mijozga ko'rsatiladi. */
  leadTimeDays: readonly [number, number];
}

/**
 * Kargo tariflari (2026-08 holatiga, joriy sherik).
 * O'zgarganda FAQAT shu obyekt tahrirlanadi — kod tegilmaydi.
 */
export const FREIGHT: Record<FreightMode, FreightTariff> = {
  AUTO: {
    usdPerKg: 6.0,
    seriesUsdPerKg: 5.8, // kelishuv bilan tushirish imkoni bor
    seriesMinQty: 10, // ⚠️ TASDIQLASH KERAK — kargo bilan aniqlanmagan
    minChargeableKg: 0.5,
    volumetricDivisor: 6000, // ⚠️ TASDIQLASH KERAK — kargo qaysi bo'luvchini ishlatadi
    leadTimeDays: [15, 17],
  },
  AVIA: {
    usdPerKg: 9.9,
    seriesUsdPerKg: 11.9, // ⚠️ ANIQLASHTIRISH — seriya narxi donadan QIMMAT ko'rinyapti
    seriesMinQty: 10, // ⚠️ TASDIQLASH KERAK
    minChargeableKg: 0.5,
    volumetricDivisor: 6000, // ⚠️ TASDIQLASH KERAK
    leadTimeDays: [5, 7],
  },
};

export interface GlobalPricingConfig {
  /** 1 USD necha CNY (masalan 7.15). */
  cnyPerUsd: number;
  /** 1 USD necha so'm. */
  uzsPerUsd: number;
  /** Kurs zaxirasi: 0.03 = 3% (kurs sakrashi va konvertatsiya yo'qotishi uchun). */
  fxBufferPct: number;
  /** Agent/sourcing haqi — tovar tannarxidan foiz (0.05 = 5%). */
  agentFeePct: number;
  /** Bojxona — tannarx+yukdan foiz. Yashil koridor/limit ostida 0 bo'lishi mumkin. */
  customsPct: number;
  /** Ekvayring komissiyasi (Click/Payme) — YAKUNIY narxdan ushlanadi (0.015 = 1.5%). */
  paymentFeePct: number;
  /** Bizning marjamiz — tannarxdan foiz (0.25 = 25%). */
  marginPct: number;
  /** Yakuniy narx shu qadamgacha YUQORIGA yaxlitlanadi (so'm). */
  roundToUzs: number;
}

/** Konservativ standart — har bir raqam alohida sozlanadi. */
export const DEFAULT_GLOBAL_CONFIG: GlobalPricingConfig = {
  cnyPerUsd: 7.15, // ⚠️ jonli kursga ulanishi kerak
  uzsPerUsd: 12_600, // ⚠️ jonli kursga ulanishi kerak
  fxBufferPct: 0.03,
  agentFeePct: 0.05,
  customsPct: 0,
  paymentFeePct: 0.015,
  marginPct: 0.25,
  roundToUzs: 1_000,
};

export interface GlobalItemInput {
  /** Taobao/1688'dagi narx, CNY (bir dona). */
  priceCny: number;
  /** Dona soni. */
  qty: number;
  /** Bir donaning aniq og'irligi, kg. */
  weightKg: number;
  /** O'lchamlari (sm) — hajmiy og'irlik uchun. Berilmasa faqat aniq og'irlik hisoblanadi. */
  dimsCm?: { l: number; w: number; h: number };
  /** Xitoy ichki dostavkasi (sotuvchidan skladgacha), CNY — butun pozitsiya uchun. */
  chinaDomesticCny?: number;
  mode: FreightMode;
}

export interface GlobalPriceBreakdown {
  /** Mijozga ko'rsatiladigan yakuniy narx (butun pozitsiya uchun), so'm. */
  totalUzs: number;
  /** Bir donaning narxi, so'm. */
  unitUzs: number;
  /** Yetkazish muddati (kun). */
  leadTimeDays: readonly [number, number];
  /** Yuk hisob-kitobiga olingan og'irlik (kg). */
  chargeableKg: number;
  /** Qo'llanilgan kg tarifi (USD) — seriya yoki dona. */
  appliedUsdPerKg: number;
  /** Shaffoflik uchun — admin panelda ko'rsatiladi, mijozga emas. */
  costs: {
    goodsUsd: number;
    chinaDomesticUsd: number;
    freightUsd: number;
    agentFeeUsd: number;
    customsUsd: number;
    /** Bizga tushadigan to'liq tannarx (so'm), marja va ekvayringsiz. */
    landedUzs: number;
    marginUzs: number;
    paymentFeeUzs: number;
  };
}

/** Hajmiy og'irlik (kg) — (uz×en×bal) / bo'luvchi. */
export function volumetricKg(dims: { l: number; w: number; h: number }, divisor: number): number {
  return (dims.l * dims.w * dims.h) / divisor;
}

/**
 * Yuk uchun hisoblanadigan og'irlik: aniq og'irlik, hajmiy og'irlik va
 * kargoning minimalidan ENG KATTASI. Butun pozitsiya (qty ta dona) uchun.
 */
export function chargeableKgFor(item: GlobalItemInput, tariff: FreightTariff): number {
  const actual = item.weightKg * item.qty;
  const volumetric = item.dimsCm
    ? volumetricKg(item.dimsCm, tariff.volumetricDivisor) * item.qty
    : 0;
  return Math.max(actual, volumetric, tariff.minChargeableKg);
}

/** Dona yoki seriya tarifi — qty bo'yicha. */
export function ratePerKgFor(qty: number, tariff: FreightTariff): number {
  if (tariff.seriesUsdPerKg !== undefined && tariff.seriesMinQty !== undefined) {
    if (qty >= tariff.seriesMinQty) return tariff.seriesUsdPerKg;
  }
  return tariff.usdPerKg;
}

/** Yuqoriga yaxlitlash (so'm). step <= 0 bo'lsa yaxlitlanmaydi. */
function roundUpTo(value: number, step: number): number {
  if (step <= 0) return Math.ceil(value);
  return Math.ceil(value / step) * step;
}

/**
 * Global mahsulot uchun mijoz to'laydigan yakuniy narx.
 *
 * Zanjir: CNY → USD → (tovar + Xitoy ichki + yuk + agent + boj) → so'm (kurs zaxirasi bilan)
 *       → marja → ekvayring komissiyasi (narxdan ushlanadi, shuning uchun "gross-up")
 *       → yuqoriga yaxlitlash.
 */
export function priceGlobalItem(
  item: GlobalItemInput,
  config: GlobalPricingConfig = DEFAULT_GLOBAL_CONFIG,
): GlobalPriceBreakdown {
  const tariff = FREIGHT[item.mode];

  // 1) Tovar tannarxi
  const goodsUsd = (item.priceCny * item.qty) / config.cnyPerUsd;
  const chinaDomesticUsd = (item.chinaDomesticCny ?? 0) / config.cnyPerUsd;

  // 2) Xalqaro yuk
  const chargeableKg = chargeableKgFor(item, tariff);
  const appliedUsdPerKg = ratePerKgFor(item.qty, tariff);
  const freightUsd = chargeableKg * appliedUsdPerKg;

  // 3) Agent haqi — tovar qiymatidan (yukdan emas)
  const agentFeeUsd = (goodsUsd + chinaDomesticUsd) * config.agentFeePct;

  // 4) Boj — tannarx + yukdan
  const dutiableUsd = goodsUsd + chinaDomesticUsd + freightUsd;
  const customsUsd = dutiableUsd * config.customsPct;

  // 5) So'mga o'tkazish — kurs zaxirasi bilan
  const totalCostUsd = goodsUsd + chinaDomesticUsd + freightUsd + agentFeeUsd + customsUsd;
  const effectiveUzsPerUsd = config.uzsPerUsd * (1 + config.fxBufferPct);
  const landedUzs = totalCostUsd * effectiveUzsPerUsd;

  // 6) Marja
  const marginUzs = landedUzs * config.marginPct;
  const beforePaymentUzs = landedUzs + marginUzs;

  // 7) Ekvayring komissiyasi narxdan USHLANADI — shuning uchun ustiga qo'shmay,
  //    "gross-up" qilamiz: x/(1-fee). Aks holda marja komissiya hajmida yeyiladi.
  const grossUzs =
    config.paymentFeePct > 0 && config.paymentFeePct < 1
      ? beforePaymentUzs / (1 - config.paymentFeePct)
      : beforePaymentUzs;
  const paymentFeeUzs = grossUzs - beforePaymentUzs;

  const totalUzs = roundUpTo(grossUzs, config.roundToUzs);

  return {
    totalUzs,
    unitUzs: item.qty > 0 ? totalUzs / item.qty : totalUzs,
    leadTimeDays: tariff.leadTimeDays,
    chargeableKg,
    appliedUsdPerKg,
    costs: {
      goodsUsd,
      chinaDomesticUsd,
      freightUsd,
      agentFeeUsd,
      customsUsd,
      landedUzs,
      marginUzs,
      paymentFeeUzs,
    },
  };
}

/**
 * AUTO va AVIA variantlarini yonma-yon qaytaradi — mijoz tanlashi uchun
 * ("15-17 kun / arzon" yoki "5-7 kun / tez").
 */
export function priceGlobalItemAllModes(
  item: Omit<GlobalItemInput, 'mode'>,
  config: GlobalPricingConfig = DEFAULT_GLOBAL_CONFIG,
): Record<FreightMode, GlobalPriceBreakdown> {
  return {
    AUTO: priceGlobalItem({ ...item, mode: 'AUTO' }, config),
    AVIA: priceGlobalItem({ ...item, mode: 'AVIA' }, config),
  };
}
