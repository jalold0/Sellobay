import { describe, expect, it } from 'vitest';

import { DEFAULT_GLOBAL_CONFIG, FREIGHT } from './global-pricing.ts';
import { DEFAULT_VARIANCE_THRESHOLDS } from './global-variance.ts';
import { DEFAULT_WEIGHT_GUARANTEE_PCT, resolveGlobalSettings } from './global-settings.ts';
import { CATEGORY_WEIGHT_KG } from './global-weight.ts';

describe('resolveGlobalSettings — standart holat', () => {
  it('sozlama bo‘lmasa standartlar qaytadi', () => {
    const r = resolveGlobalSettings(null);
    expect(r.pricing).toEqual(DEFAULT_GLOBAL_CONFIG);
    expect(r.freight.AUTO).toEqual(FREIGHT.AUTO);
    expect(r.freight.AVIA).toEqual(FREIGHT.AVIA);
    expect(r.variance).toEqual(DEFAULT_VARIANCE_THRESHOLDS);
    expect(r.weightGuaranteePct).toBe(DEFAULT_WEIGHT_GUARANTEE_PCT);
    expect(r.categoryWeightKg).toEqual(CATEGORY_WEIGHT_KG);
  });

  it('bo‘sh obyekt ham standartni buzmaydi', () => {
    expect(resolveGlobalSettings({}).pricing).toEqual(DEFAULT_GLOBAL_CONFIG);
  });
});

describe('resolveGlobalSettings — o‘zgarishlar qo‘llanishi', () => {
  it('kurs va marja almashadi, qolgani standart qoladi', () => {
    const r = resolveGlobalSettings({ pricing: { uzsPerUsd: 13_000, marginPct: 0.3 } });
    expect(r.pricing.uzsPerUsd).toBe(13_000);
    expect(r.pricing.marginPct).toBe(0.3);
    expect(r.pricing.agentFeePct).toBe(DEFAULT_GLOBAL_CONFIG.agentFeePct);
  });

  it('kargo tarifi qismanm o‘zgaradi', () => {
    const r = resolveGlobalSettings({ freight: { AUTO: { usdPerKg: 5.8 } } });
    expect(r.freight.AUTO.usdPerKg).toBe(5.8);
    expect(r.freight.AUTO.minChargeableKg).toBe(FREIGHT.AUTO.minChargeableKg);
    expect(r.freight.AVIA).toEqual(FREIGHT.AVIA);
  });

  it('yetkazish muddati juftlik sifatida almashadi', () => {
    const r = resolveGlobalSettings({ freight: { AUTO: { leadTimeDays: [12, 14] } } });
    expect(r.freight.AUTO.leadTimeDays).toEqual([12, 14]);
  });

  it('kategoriya og‘irligi almashadi (o‘lchov to‘plangach)', () => {
    const r = resolveGlobalSettings({ categoryWeightKg: { SHOES: 1.05 } });
    expect(r.categoryWeightKg.SHOES).toBe(1.05);
    expect(r.categoryWeightKg.TSHIRT).toBe(CATEGORY_WEIGHT_KG.TSHIRT);
  });

  it('chetlanish chegaralari almashadi', () => {
    const r = resolveGlobalSettings({ variance: { absorbPct: 0.08 } });
    expect(r.variance.absorbPct).toBe(0.08);
    expect(r.variance.cancelPct).toBe(DEFAULT_VARIANCE_THRESHOLDS.cancelPct);
  });
});

describe('resolveGlobalSettings — buzuq konfig narxni buzmaydi', () => {
  it('manfiy va nol tariflar e‘tiborga olinmaydi', () => {
    const r = resolveGlobalSettings({ freight: { AUTO: { usdPerKg: -5 } } });
    expect(r.freight.AUTO.usdPerKg).toBe(FREIGHT.AUTO.usdPerKg);
    const z = resolveGlobalSettings({ freight: { AUTO: { usdPerKg: 0 } } });
    expect(z.freight.AUTO.usdPerKg).toBe(FREIGHT.AUTO.usdPerKg);
  });

  it('son bo‘lmagan qiymat e‘tiborga olinmaydi', () => {
    const r = resolveGlobalSettings({
      pricing: { uzsPerUsd: 'juda ko‘p' as unknown as number },
    });
    expect(r.pricing.uzsPerUsd).toBe(DEFAULT_GLOBAL_CONFIG.uzsPerUsd);
  });

  it('NaN va Infinity o‘tmaydi', () => {
    const r = resolveGlobalSettings({ pricing: { marginPct: Number.NaN } });
    expect(r.pricing.marginPct).toBe(DEFAULT_GLOBAL_CONFIG.marginPct);
    const i = resolveGlobalSettings({ pricing: { uzsPerUsd: Number.POSITIVE_INFINITY } });
    expect(i.pricing.uzsPerUsd).toBe(DEFAULT_GLOBAL_CONFIG.uzsPerUsd);
  });

  it('chegaradan oshgan foiz e‘tiborga olinmaydi', () => {
    // marja 500% dan ko'p bo'lishi mumkin emas
    const r = resolveGlobalSettings({ pricing: { marginPct: 50 } });
    expect(r.pricing.marginPct).toBe(DEFAULT_GLOBAL_CONFIG.marginPct);
    // ekvayring 50% dan oshmaydi (gross-up nolga bo'linishga olib kelmasin)
    const p = resolveGlobalSettings({ pricing: { paymentFeePct: 0.9 } });
    expect(p.pricing.paymentFeePct).toBe(DEFAULT_GLOBAL_CONFIG.paymentFeePct);
  });

  it('noma‘lum kategoriya kaliti tashlanadi', () => {
    const r = resolveGlobalSettings({
      categoryWeightKg: { NOMA_LUM: 5 } as never,
    });
    expect(r.categoryWeightKg).toEqual(CATEGORY_WEIGHT_KG);
  });

  it('noto‘g‘ri muddat juftligi e‘tiborga olinmaydi', () => {
    const r = resolveGlobalSettings({
      freight: { AVIA: { leadTimeDays: [3] as unknown as readonly [number, number] } },
    });
    expect(r.freight.AVIA.leadTimeDays).toEqual(FREIGHT.AVIA.leadTimeDays);
  });
});
