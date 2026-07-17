import { describe, expect, it } from 'vitest';

import {
  COIN_VALUE_SOM,
  TIERS,
  coinsForOrder,
  coinsToSom,
  currentTier,
  nextTier,
  tierProgressPct,
} from './loyalty.ts';

describe('coinsForOrder (earn: 1 coin / 1000 so‘m)', () => {
  it('1 000 000 so‘m → 1000 coin (1% cashback)', () => {
    expect(coinsForOrder(1_000_000)).toBe(1_000);
  });

  it('pastga yaxlitlaydi (999 so‘m → 0 coin, 1999 → 1)', () => {
    expect(coinsForOrder(999)).toBe(0);
    expect(coinsForOrder(1_999)).toBe(1);
  });

  it('manfiy summa hech qachon manfiy coin bermaydi', () => {
    expect(coinsForOrder(-5_000)).toBe(0);
  });
});

describe('coinsToSom (redeem: 1 coin = 10 so‘m)', () => {
  it('50 coin → 500 so‘m', () => {
    expect(coinsToSom(50)).toBe(50 * COIN_VALUE_SOM);
  });

  it('kasr coin pastga yaxlitlanadi, manfiy → 0', () => {
    expect(coinsToSom(10.9)).toBe(100);
    expect(coinsToSom(-3)).toBe(0);
  });
});

describe('tier tizimi', () => {
  it('TIERS o‘sish tartibida (min bo‘yicha)', () => {
    for (let i = 1; i < TIERS.length; i++) {
      expect(TIERS[i]!.min).toBeGreaterThan(TIERS[i - 1]!.min);
    }
  });

  it('chegaralar: 0→bronze, 1M→silver, 5M→gold, 20M→platinum', () => {
    expect(currentTier(0).key).toBe('bronze');
    expect(currentTier(999_999).key).toBe('bronze');
    expect(currentTier(1_000_000).key).toBe('silver');
    expect(currentTier(5_000_000).key).toBe('gold');
    expect(currentTier(20_000_000).key).toBe('platinum');
  });

  it('nextTier — platinumdan keyin yo‘q', () => {
    expect(nextTier(0)?.key).toBe('silver');
    expect(nextTier(20_000_000)).toBeUndefined();
  });

  it('tierProgressPct — 0..100 oraliqda, platinum=100', () => {
    expect(tierProgressPct(0)).toBe(0);
    expect(tierProgressPct(500_000)).toBe(50); // bronze→silver yarim yo‘l
    expect(tierProgressPct(25_000_000)).toBe(100);
  });
});
