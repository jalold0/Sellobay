import { describe, expect, it } from 'vitest';

import {
  CATEGORY_WEIGHT_KG,
  estimateWeightKg,
  roundUpKg,
  weightGuaranteeCeilingKg,
} from './global-weight.ts';

describe('roundUpKg', () => {
  it('0.5 kg qadamiga yuqoriga yaxlitlaydi', () => {
    expect(roundUpKg(0.35)).toBe(0.5);
    expect(roundUpKg(0.51)).toBe(1);
    expect(roundUpKg(1.2)).toBe(1.5);
    expect(roundUpKg(2.6)).toBe(3);
  });

  it('qadamga aniq tushsa oshirmaydi', () => {
    expect(roundUpKg(0.5)).toBe(0.5);
    expect(roundUpKg(1)).toBe(1);
    expect(roundUpKg(2.5)).toBe(2.5);
  });

  it('suzuvchi nuqta xatosi qo‘shimcha qadam qo‘shmaydi', () => {
    // 0.1 + 0.2 = 0.30000000000000004 — yaxlitlash 0.5 dan oshib ketmasligi kerak
    expect(roundUpKg(0.1 + 0.2)).toBe(0.5);
    expect(roundUpKg(1.5 + 1.5)).toBe(3);
  });

  it('step 0 bo‘lsa yaxlitlanmaydi', () => {
    expect(roundUpKg(1.234, 0)).toBe(1.234);
  });
});

describe('estimateWeightKg — manba ustuvorligi', () => {
  it('o‘lchangan og‘irlik hammasidan ustun va taxmin emas', () => {
    const r = estimateWeightKg({
      category: 'SHOES',
      qty: 1,
      actualWeightKg: 0.8,
      manualWeightKg: 2,
    });
    expect(r).toEqual({ kg: 0.8, isEstimated: false, source: 'MEASURED' });
  });

  it('o‘lchov bo‘lmasa operator kiritgani ishlatiladi', () => {
    const r = estimateWeightKg({ category: 'SHOES', qty: 1, manualWeightKg: 0.6 });
    expect(r).toEqual({ kg: 0.6, isEstimated: true, source: 'MANUAL' });
  });

  it('hech narsa bo‘lmasa kategoriya standarti', () => {
    const r = estimateWeightKg({ category: 'TSHIRT', qty: 1 });
    expect(r.source).toBe('CATEGORY');
    expect(r.isEstimated).toBe(true);
    expect(r.kg).toBe(CATEGORY_WEIGHT_KG.TSHIRT);
  });

  it('noma‘lum kategoriya eng ehtiyotkor bahoni oladi', () => {
    const r = estimateWeightKg({ category: 'OTHER', qty: 1 });
    expect(r.kg).toBe(1);
  });
});

describe('estimateWeightKg — miqdor va yaxlitlamaslik', () => {
  it('og‘irlik qty ga ko‘payadi', () => {
    expect(estimateWeightKg({ category: 'TSHIRT', qty: 3 }).kg).toBeCloseTo(1.05, 6);
  });

  it('YAXLITLAMAYDI — bu narx dvigatelining ishi (ikki marta yaxlitlash zarari)', () => {
    // 0.35 kg qoladi; agar bu yerda 0.5 ga yaxlitlansa, dvigateldagi zaxira
    // uni 1 kg ga chiqarib yuboradi va yengil tovar ikki barobar qimmatlashadi
    expect(estimateWeightKg({ category: 'TSHIRT', qty: 1 }).kg).toBe(0.35);
  });

  it('qty 0 yoki manfiy bo‘lsa 1 dona deb hisoblanadi', () => {
    expect(estimateWeightKg({ category: 'TSHIRT', qty: 0 }).kg).toBe(0.35);
    expect(estimateWeightKg({ category: 'TSHIRT', qty: -5 }).kg).toBe(0.35);
  });

  it('nol yoki manfiy og‘irlik e‘tiborga olinmaydi (kategoriyaga qaytadi)', () => {
    const r = estimateWeightKg({ category: 'SHOES', qty: 1, actualWeightKg: 0, manualWeightKg: 0 });
    expect(r.source).toBe('CATEGORY');
  });
});

describe('weightGuaranteeCeilingKg', () => {
  it('taxminiy og‘irlikda kafolat koridorini ochadi', () => {
    // 1 kg + 20% = 1.2 → 1.5
    expect(weightGuaranteeCeilingKg(1, true, 0.2)).toBe(1.5);
  });

  it('o‘lchangan og‘irlikda koridor kerak emas', () => {
    expect(weightGuaranteeCeilingKg(1, false, 0.2)).toBe(1);
  });

  it('manfiy foiz og‘irlikni pasaytirmaydi', () => {
    expect(weightGuaranteeCeilingKg(2, true, -0.5)).toBe(2);
  });
});
