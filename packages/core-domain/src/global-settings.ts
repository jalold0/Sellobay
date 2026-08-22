// Global sozlamalar — standart qiymatlar ustiga qo'yiladigan o'zgarishlarni birlashtirish.
//
// NEGA KERAK: kargo tariflari kelishuv bilan o'zgaradi, kurs esa har kuni. Bularni
// har safar kod deploy qilib o'zgartirish mumkin emas. Shuning uchun bazada
// (`GlobalSetting.config`) faqat FARQLAR saqlanadi, qolgani shu paketdagi standart.
//
// Bu fayl sof: bazani ham, HTTP'ni ham bilmaydi. Birlashtirish va chegaralash mantiqi
// bitta joyda tursin — web ham, admin ham shu funksiyani chaqiradi.

import {
  DEFAULT_GLOBAL_CONFIG,
  FREIGHT,
  type FreightMode,
  type FreightTariff,
  type GlobalPricingConfig,
} from './global-pricing.ts';
import { DEFAULT_VARIANCE_THRESHOLDS, type VarianceThresholds } from './global-variance.ts';
import { CATEGORY_WEIGHT_KG, type WeightCategory } from './global-weight.ts';

/** Narx kafolati koridori: ko'rsatilgan narx shu foizgacha og'irlik oshsa ham amal qiladi. */
export const DEFAULT_WEIGHT_GUARANTEE_PCT = 0.2;

export interface GlobalSettingsOverride {
  pricing?: Partial<GlobalPricingConfig>;
  freight?: Partial<Record<FreightMode, Partial<FreightTariff>>>;
  variance?: Partial<VarianceThresholds>;
  weightGuaranteePct?: number;
  categoryWeightKg?: Partial<Record<WeightCategory, number>>;
}

export interface ResolvedGlobalSettings {
  pricing: GlobalPricingConfig;
  freight: Record<FreightMode, FreightTariff>;
  variance: VarianceThresholds;
  weightGuaranteePct: number;
  categoryWeightKg: Record<WeightCategory, number>;
}

/** Faqat musbat sonlar qabul qilinadi; aks holda standart qoladi. */
function num(value: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  if (value < min || value > max) return fallback;
  return value;
}

function mergeTariff(base: FreightTariff, over?: Partial<FreightTariff>): FreightTariff {
  if (!over) return base;
  const lead = Array.isArray(over.leadTimeDays) ? over.leadTimeDays : null;
  return {
    usdPerKg: num(over.usdPerKg, base.usdPerKg, 0.01, 1000),
    seriesUsdPerKg:
      over.seriesUsdPerKg === undefined
        ? base.seriesUsdPerKg
        : num(over.seriesUsdPerKg, base.seriesUsdPerKg ?? base.usdPerKg, 0.01, 1000),
    seriesMinQty:
      over.seriesMinQty === undefined
        ? base.seriesMinQty
        : Math.round(num(over.seriesMinQty, base.seriesMinQty ?? 10, 1, 100_000)),
    minChargeableKg: num(over.minChargeableKg, base.minChargeableKg, 0, 1000),
    roundStepKg: num(over.roundStepKg, base.roundStepKg, 0, 100),
    volumetricDivisor: num(over.volumetricDivisor, base.volumetricDivisor, 100, 100_000),
    leadTimeDays:
      lead && lead.length === 2
        ? ([
            Math.round(num(lead[0], base.leadTimeDays[0], 1, 365)),
            Math.round(num(lead[1], base.leadTimeDays[1], 1, 365)),
          ] as const)
        : base.leadTimeDays,
  };
}

/**
 * Standart sozlamalar ustiga bazadagi o'zgarishlarni qo'yadi.
 * Noto'g'ri/chegaradan tashqari qiymat E'TIBORGA OLINMAYDI — standart qoladi,
 * ya'ni buzuq konfig narxni nolga tushirib yubormaydi.
 */
export function resolveGlobalSettings(
  override?: GlobalSettingsOverride | null,
): ResolvedGlobalSettings {
  const p = override?.pricing ?? {};
  const v = override?.variance ?? {};

  const pricing: GlobalPricingConfig = {
    cnyPerUsd: num(p.cnyPerUsd, DEFAULT_GLOBAL_CONFIG.cnyPerUsd, 0.01, 1000),
    uzsPerUsd: num(p.uzsPerUsd, DEFAULT_GLOBAL_CONFIG.uzsPerUsd, 1, 10_000_000),
    fxBufferPct: num(p.fxBufferPct, DEFAULT_GLOBAL_CONFIG.fxBufferPct, 0, 1),
    agentFeePct: num(p.agentFeePct, DEFAULT_GLOBAL_CONFIG.agentFeePct, 0, 1),
    customsPct: num(p.customsPct, DEFAULT_GLOBAL_CONFIG.customsPct, 0, 2),
    paymentFeePct: num(p.paymentFeePct, DEFAULT_GLOBAL_CONFIG.paymentFeePct, 0, 0.5),
    marginPct: num(p.marginPct, DEFAULT_GLOBAL_CONFIG.marginPct, 0, 5),
    roundToUzs: num(p.roundToUzs, DEFAULT_GLOBAL_CONFIG.roundToUzs, 0, 1_000_000),
    weightRiskPct: num(p.weightRiskPct, DEFAULT_GLOBAL_CONFIG.weightRiskPct, 0, 1),
  };

  const categoryWeightKg = { ...CATEGORY_WEIGHT_KG };
  for (const [key, value] of Object.entries(override?.categoryWeightKg ?? {})) {
    if (key in categoryWeightKg) {
      const cat = key as WeightCategory;
      categoryWeightKg[cat] = num(value, categoryWeightKg[cat], 0.01, 500);
    }
  }

  return {
    pricing,
    freight: {
      AUTO: mergeTariff(FREIGHT.AUTO, override?.freight?.AUTO),
      AVIA: mergeTariff(FREIGHT.AVIA, override?.freight?.AVIA),
    },
    variance: {
      absorbPct: num(v.absorbPct, DEFAULT_VARIANCE_THRESHOLDS.absorbPct, 0, 1),
      cancelPct: num(v.cancelPct, DEFAULT_VARIANCE_THRESHOLDS.cancelPct, 0, 5),
    },
    weightGuaranteePct: num(override?.weightGuaranteePct, DEFAULT_WEIGHT_GUARANTEE_PCT, 0, 2),
    categoryWeightKg,
  };
}
