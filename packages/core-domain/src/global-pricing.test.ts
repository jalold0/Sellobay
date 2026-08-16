import { describe, expect, it } from 'vitest';

import {
  DEFAULT_GLOBAL_CONFIG,
  FREIGHT,
  chargeableKgFor,
  priceGlobalItem,
  priceGlobalItemAllModes,
  ratePerKgFor,
  volumetricKg,
  type GlobalItemInput,
} from './global-pricing.ts';

const baseItem: GlobalItemInput = {
  priceCny: 100,
  qty: 1,
  weightKg: 1,
  mode: 'AUTO',
};

describe('volumetricKg', () => {
  it('30x20x10 sm / 6000 = 1 kg', () => {
    expect(volumetricKg({ l: 30, w: 20, h: 10 }, 6000)).toBe(1);
  });
});

describe('chargeableKgFor', () => {
  it('aniq og‘irlik hajmiydan katta bo‘lsa — aniq og‘irlik', () => {
    const item = { ...baseItem, weightKg: 5, dimsCm: { l: 30, w: 20, h: 10 } };
    expect(chargeableKgFor(item, FREIGHT.AUTO)).toBe(5);
  });

  it('hajmiy og‘irlik kattaroq bo‘lsa — hajmiy og‘irlik (yengil, katta quti)', () => {
    const item = { ...baseItem, weightKg: 0.4, dimsCm: { l: 60, w: 40, h: 30 } };
    // 60*40*30/6000 = 12 kg
    expect(chargeableKgFor(item, FREIGHT.AUTO)).toBe(12);
  });

  it('juda yengil tovar — kargo minimalidan past tushmaydi', () => {
    const item = { ...baseItem, weightKg: 0.05 };
    expect(chargeableKgFor(item, FREIGHT.AUTO)).toBe(FREIGHT.AUTO.minChargeableKg);
  });

  it('og‘irlik qty ga ko‘payadi', () => {
    expect(chargeableKgFor({ ...baseItem, weightKg: 2, qty: 3 }, FREIGHT.AUTO)).toBe(6);
  });
});

describe('ratePerKgFor', () => {
  it('AUTO — dona uchun 6.0, seriya chegarasidan boshlab 5.8', () => {
    expect(ratePerKgFor(1, FREIGHT.AUTO)).toBe(6.0);
    expect(ratePerKgFor(FREIGHT.AUTO.seriesMinQty! - 1, FREIGHT.AUTO)).toBe(6.0);
    expect(ratePerKgFor(FREIGHT.AUTO.seriesMinQty!, FREIGHT.AUTO)).toBe(5.8);
  });

  it('seriya tarifi belgilanmagan bo‘lsa — har doim asosiy tarif', () => {
    const tariff = { ...FREIGHT.AUTO, seriesUsdPerKg: undefined, seriesMinQty: undefined };
    expect(ratePerKgFor(1000, tariff)).toBe(FREIGHT.AUTO.usdPerKg);
  });
});

describe('priceGlobalItem', () => {
  it('to‘liq zanjirni qo‘lda hisoblangan qiymat bilan solishtiradi', () => {
    const cfg = {
      ...DEFAULT_GLOBAL_CONFIG,
      cnyPerUsd: 7,
      uzsPerUsd: 12_000,
      fxBufferPct: 0,
      agentFeePct: 0,
      customsPct: 0,
      paymentFeePct: 0,
      marginPct: 0,
      roundToUzs: 0,
    };
    // tovar: 70 CNY / 7 = 10 USD; yuk: 1 kg × 6.0 = 6 USD → 16 USD × 12 000 = 192 000
    const r = priceGlobalItem({ ...baseItem, priceCny: 70, weightKg: 1 }, cfg);
    expect(r.costs.goodsUsd).toBe(10);
    expect(r.costs.freightUsd).toBe(6);
    expect(r.totalUzs).toBe(192_000);
  });

  it('ekvayring komissiyasi USTIGA qo‘shilmaydi — narxdan ushlanadi (gross-up)', () => {
    const cfg = {
      ...DEFAULT_GLOBAL_CONFIG,
      cnyPerUsd: 7,
      uzsPerUsd: 12_000,
      fxBufferPct: 0,
      agentFeePct: 0,
      customsPct: 0,
      marginPct: 0,
      paymentFeePct: 0.02,
      roundToUzs: 0,
    };
    const r = priceGlobalItem({ ...baseItem, priceCny: 70, weightKg: 1 }, cfg);
    // 192 000 / 0.98 = 195 918.36… (butun so‘mgacha yuqoriga yaxlitlanadi)
    expect(r.totalUzs).toBe(Math.ceil(192_000 / 0.98));
    // komissiya ushlangach qo‘limizda tannarx qoladi (yaxlitlash foydamizga, 1 so‘mdan kam)
    const netUzs = r.totalUzs - r.costs.paymentFeeUzs;
    expect(netUzs).toBeGreaterThanOrEqual(192_000);
    expect(netUzs).toBeLessThan(192_001);
  });

  it('kurs zaxirasi kursni oshiradi (tannarx yuqori baholanadi)', () => {
    const withoutBuffer = priceGlobalItem(baseItem, {
      ...DEFAULT_GLOBAL_CONFIG,
      fxBufferPct: 0,
    });
    const withBuffer = priceGlobalItem(baseItem, { ...DEFAULT_GLOBAL_CONFIG, fxBufferPct: 0.03 });
    expect(withBuffer.costs.landedUzs).toBeGreaterThan(withoutBuffer.costs.landedUzs);
  });

  it('marja tannarxdan hisoblanadi', () => {
    const r = priceGlobalItem(baseItem, { ...DEFAULT_GLOBAL_CONFIG, marginPct: 0.25 });
    expect(r.costs.marginUzs).toBeCloseTo(r.costs.landedUzs * 0.25, 6);
  });

  it('yakuniy narx yuqoriga yaxlitlanadi (hech qachon pastga emas)', () => {
    const r = priceGlobalItem(baseItem);
    expect(r.totalUzs % DEFAULT_GLOBAL_CONFIG.roundToUzs).toBe(0);
    const raw = r.costs.landedUzs + r.costs.marginUzs + r.costs.paymentFeeUzs;
    expect(r.totalUzs).toBeGreaterThanOrEqual(raw);
    expect(r.totalUzs - raw).toBeLessThan(DEFAULT_GLOBAL_CONFIG.roundToUzs);
  });

  it('yengil-katta tovarda hajmiy og‘irlik narxni oshiradi', () => {
    const compact = priceGlobalItem({ ...baseItem, weightKg: 0.4 });
    const bulky = priceGlobalItem({
      ...baseItem,
      weightKg: 0.4,
      dimsCm: { l: 60, w: 40, h: 30 },
    });
    expect(bulky.totalUzs).toBeGreaterThan(compact.totalUzs);
  });

  it('unitUzs — pozitsiya narxining donaga bo‘lingani', () => {
    const r = priceGlobalItem({ ...baseItem, qty: 4 });
    expect(r.unitUzs).toBeCloseTo(r.totalUzs / 4, 6);
  });

  it('Xitoy ichki dostavkasi tannarxga kiradi', () => {
    const without = priceGlobalItem(baseItem);
    const withDomestic = priceGlobalItem({ ...baseItem, chinaDomesticCny: 15 });
    expect(withDomestic.totalUzs).toBeGreaterThan(without.totalUzs);
  });

  it('boj 0 bo‘lsa bojxona qiymati ham 0', () => {
    const r = priceGlobalItem(baseItem, { ...DEFAULT_GLOBAL_CONFIG, customsPct: 0 });
    expect(r.costs.customsUsd).toBe(0);
  });
});

describe('priceGlobalItemAllModes', () => {
  it('AVIA AUTO‘dan qimmat, lekin tezroq', () => {
    const r = priceGlobalItemAllModes({ priceCny: 100, qty: 1, weightKg: 2 });
    expect(r.AVIA.totalUzs).toBeGreaterThan(r.AUTO.totalUzs);
    expect(r.AVIA.leadTimeDays[1]).toBeLessThan(r.AUTO.leadTimeDays[0]);
  });

  it('ikkala usul ham amaldagi tarifni qaytaradi', () => {
    const r = priceGlobalItemAllModes({ priceCny: 100, qty: 1, weightKg: 2 });
    expect(r.AUTO.appliedUsdPerKg).toBe(FREIGHT.AUTO.usdPerKg);
    expect(r.AVIA.appliedUsdPerKg).toBe(FREIGHT.AVIA.usdPerKg);
  });
});
