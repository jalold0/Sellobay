import { describe, expect, it } from 'vitest';

import { discountedProducts } from './discount';

import type { MockProduct } from './mock-data';

const p = (id: string, price: number, oldPrice?: number) =>
  ({ id, price, oldPrice }) as unknown as MockProduct;

describe('discountedProducts (audit TRU-02)', () => {
  it('faqat eski narxi joriydan katta bo`lganlar', () => {
    const out = discountedProducts([
      p('a', 100, 120),
      p('b', 100),
      p('c', 100, 100),
      p('d', 90, 80),
    ]);
    expect(out.map((x) => x.id)).toEqual(['a']);
  });

  it('chegirma yo`q bo`lsa — bo`sh (bo`lim ko`rsatilmaydi)', () => {
    expect(discountedProducts([p('a', 100), p('b', 50)])).toEqual([]);
  });

  it('limit', () => {
    const many = Array.from({ length: 12 }, (_, i) => p(String(i), 100, 150));
    expect(discountedProducts(many)).toHaveLength(8);
  });
});
