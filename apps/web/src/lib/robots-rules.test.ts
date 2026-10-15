import { describe, expect, it } from 'vitest';

import { privateDisallowPaths } from './robots-rules';

describe('privateDisallowPaths (audit SEO-01)', () => {
  it('har bir til prefiksi bilan yoziladi — /uz/cart kabi haqiqiy URL`ga mos keladi', () => {
    const paths = privateDisallowPaths(['uz', 'ru']);
    expect(paths).toContain('/uz/cart');
    expect(paths).toContain('/ru/checkout');
    expect(paths).toContain('/uz/profile');
    expect(paths).toContain('/ru/orders');
    expect(paths).toContain('/api/');
  });

  it('standart — barcha tillar', () => {
    expect(privateDisallowPaths()).toContain('/en/cart');
  });
});
