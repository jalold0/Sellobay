import { describe, expect, it } from 'vitest';

import { EXPRESS_FEE, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, shippingFor } from './pricing.ts';

describe('shippingFor', () => {
  it('EXPRESS — har doim express narx (subtotal muhim emas)', () => {
    expect(shippingFor('EXPRESS', 0)).toBe(EXPRESS_FEE);
    expect(shippingFor('EXPRESS', 10_000_000)).toBe(EXPRESS_FEE);
  });

  it('PICKUP_POINT — har doim tekin', () => {
    expect(shippingFor('PICKUP_POINT', 0)).toBe(0);
    expect(shippingFor('PICKUP_POINT', 100_000)).toBe(0);
  });

  it('HOME_DELIVERY — chegaradan past bo‘lsa standart narx', () => {
    expect(shippingFor('HOME_DELIVERY', 0)).toBe(SHIPPING_FEE);
    expect(shippingFor('HOME_DELIVERY', FREE_SHIPPING_THRESHOLD - 1)).toBe(SHIPPING_FEE);
  });

  it('HOME_DELIVERY — chegarada va undan yuqorida tekin (>= semantika)', () => {
    expect(shippingFor('HOME_DELIVERY', FREE_SHIPPING_THRESHOLD)).toBe(0);
    expect(shippingFor('HOME_DELIVERY', FREE_SHIPPING_THRESHOLD + 1)).toBe(0);
  });

  it('konstantalar biznes qiymatlariga mos (regressiya qulfi)', () => {
    expect(SHIPPING_FEE).toBe(20_000);
    expect(EXPRESS_FEE).toBe(50_000);
    expect(FREE_SHIPPING_THRESHOLD).toBe(500_000);
  });
});
