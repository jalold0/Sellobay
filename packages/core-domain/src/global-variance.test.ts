import { describe, expect, it } from 'vitest';

import { DEFAULT_VARIANCE_THRESHOLDS, evaluateVariance } from './global-variance.ts';

const PAID = 500_000;

describe('evaluateVariance — biz yutgan holatlar', () => {
  it('haqiqiy narx arzonroq — hech kimdan hech narsa so‘ralmaydi', () => {
    const r = evaluateVariance(PAID, 450_000);
    expect(r.decision).toBe('AUTO_CONFIRM');
    expect(r.diffUzs).toBe(-50_000);
    expect(r.extraChargeUzs).toBe(0);
    expect(r.absorbedUzs).toBe(0);
  });

  it('narx aynan bir xil', () => {
    const r = evaluateVariance(PAID, PAID);
    expect(r.decision).toBe('AUTO_CONFIRM');
    expect(r.diffUzs).toBe(0);
  });
});

describe('evaluateVariance — chidam zonasi (o‘zimiz yutamiz)', () => {
  it('chegaradan past oshish avtomatik tasdiqlanadi va biz zimmamizga olamiz', () => {
    const r = evaluateVariance(PAID, 515_000); // +3%
    expect(r.decision).toBe('AUTO_CONFIRM');
    expect(r.absorbedUzs).toBe(15_000);
    expect(r.extraChargeUzs).toBe(0);
  });

  it('aynan chegarada — hali ham biz yutamiz (>= emas, <= semantika)', () => {
    const r = evaluateVariance(PAID, PAID * (1 + DEFAULT_VARIANCE_THRESHOLDS.absorbPct));
    expect(r.decision).toBe('AUTO_CONFIRM');
    expect(r.absorbedUzs).toBeCloseTo(25_000, 6);
  });
});

describe('evaluateVariance — mijozdan so‘raladigan zona', () => {
  it('chegaradan sal oshsa mijozga xabar beriladi', () => {
    const r = evaluateVariance(PAID, 540_000); // +8%
    expect(r.decision).toBe('ASK_CUSTOMER');
    expect(r.extraChargeUzs).toBe(40_000);
    expect(r.absorbedUzs).toBe(0);
  });

  it('bekor chegarasida hali ham mijozdan so‘raladi', () => {
    const r = evaluateVariance(PAID, PAID * (1 + DEFAULT_VARIANCE_THRESHOLDS.cancelPct));
    expect(r.decision).toBe('ASK_CUSTOMER');
  });
});

describe('evaluateVariance — bekor qilish tavsiyasi', () => {
  it('juda katta oshish', () => {
    const r = evaluateVariance(PAID, 800_000); // +60%
    expect(r.decision).toBe('CANCEL_SUGGESTED');
    expect(r.diffPct).toBeCloseTo(0.6, 6);
  });
});

describe('evaluateVariance — chegaralarni sozlash', () => {
  it('chidam 0 bo‘lsa har qanday oshish mijozga boradi', () => {
    const r = evaluateVariance(PAID, 501_000, { absorbPct: 0, cancelPct: 0.3 });
    expect(r.decision).toBe('ASK_CUSTOMER');
  });

  it('keng chidam katta oshishni ham yutadi', () => {
    const r = evaluateVariance(PAID, 600_000, { absorbPct: 0.25, cancelPct: 0.5 });
    expect(r.decision).toBe('AUTO_CONFIRM');
    expect(r.absorbedUzs).toBe(100_000);
  });
});

describe('evaluateVariance — chekka holatlar', () => {
  it('to‘lov nolga teng bo‘lsa nolga bo‘lish bo‘lmaydi', () => {
    const r = evaluateVariance(0, 100_000);
    expect(r.diffPct).toBe(Infinity);
    expect(r.decision).toBe('CANCEL_SUGGESTED');
  });
});
