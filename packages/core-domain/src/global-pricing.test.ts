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
    // og'irlik o'lchangan deb belgilanadi — zaxira aralashmasin
    const r = priceGlobalItem(
      { ...baseItem, priceCny: 70, weightKg: 1, weightIsEstimated: false },
      cfg,
    );
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
    const r = priceGlobalItem(
      { ...baseItem, priceCny: 70, weightKg: 1, weightIsEstimated: false },
      cfg,
    );
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

describe('priceGlobalItem — og‘irlik zaxirasi', () => {
  it('taxminiy og‘irlikda zaxira qo‘shiladi, o‘lchanganida qo‘shilmaydi', () => {
    const estimated = priceGlobalItem({ ...baseItem, weightKg: 2, weightIsEstimated: true });
    const measured = priceGlobalItem({ ...baseItem, weightKg: 2, weightIsEstimated: false });
    expect(measured.chargeableKg).toBe(2);
    // 2 kg + 10% = 2.2 → kargo qadamiga yaxlitlanib 2.5
    expect(estimated.chargeableKg).toBe(2.5);
    expect(estimated.totalUzs).toBeGreaterThan(measured.totalUzs);
  });

  it('standart — og‘irlik taxminiy deb qabul qilinadi (ehtiyotkorlik tomonga)', () => {
    const r = priceGlobalItem({ ...baseItem, weightKg: 2 });
    expect(r.weightIsEstimated).toBe(true);
    expect(r.chargeableKg).toBeGreaterThan(r.baseChargeableKg);
  });

  it('baseChargeableKg zaxirasiz qiymatni saqlaydi', () => {
    const r = priceGlobalItem({ ...baseItem, weightKg: 2, weightIsEstimated: true });
    expect(r.baseChargeableKg).toBe(2);
  });

  it('zaxira 0 bo‘lsa taxminiy og‘irlik ham oshmaydi', () => {
    const r = priceGlobalItem(
      { ...baseItem, weightKg: 2, weightIsEstimated: true },
      { ...DEFAULT_GLOBAL_CONFIG, weightRiskPct: 0 },
    );
    expect(r.chargeableKg).toBe(2);
  });
});

describe('chargeableKgFor — kargo yaxlitlashi va zaxira tartibi', () => {
  it('og‘irlik kargo qadamiga yuqoriga yaxlitlanadi', () => {
    // 1.2 kg → 1.5 kg
    expect(chargeableKgFor({ ...baseItem, weightKg: 1.2 }, FREIGHT.AUTO)).toBe(1.5);
    // 0.35 kg → minimal 0.5
    expect(chargeableKgFor({ ...baseItem, weightKg: 0.35 }, FREIGHT.AUTO)).toBe(0.5);
  });

  it('yengil tovarda zaxira minimal og‘irlik ichida yutiladi (1 kg ga sakramaydi)', () => {
    // 0.35 × 1.1 = 0.385 → minimal 0.5 → 0.5. Zaxira minimaldan KEYIN qo'llanganda 1 kg bo'lardi.
    expect(chargeableKgFor({ ...baseItem, weightKg: 0.35 }, FREIGHT.AUTO, 0.1)).toBe(0.5);
  });

  it('minimaldan yuqorida zaxira haqiqatan ta‘sir qiladi', () => {
    // 1.3 × 1.1 = 1.43 → 1.5
    expect(chargeableKgFor({ ...baseItem, weightKg: 1.3 }, FREIGHT.AUTO, 0.1)).toBe(1.5);
    // zaxirasiz: 1.3 → 1.5 ham bo'ladi, shuning uchun kattaroq misol:
    expect(chargeableKgFor({ ...baseItem, weightKg: 2.4 }, FREIGHT.AUTO)).toBe(2.5);
    expect(chargeableKgFor({ ...baseItem, weightKg: 2.4 }, FREIGHT.AUTO, 0.1)).toBe(3);
  });

  it('o‘lchangan og‘irlikda zaxira qo‘llanmaydi', () => {
    expect(
      chargeableKgFor({ ...baseItem, weightKg: 2.4, weightIsEstimated: false }, FREIGHT.AUTO, 0.1),
    ).toBe(2.5);
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
