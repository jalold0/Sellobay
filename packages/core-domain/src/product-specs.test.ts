import { describe, expect, it } from 'vitest';

import { MAX_PRODUCT_SPECS, normalizeProductSpecs, readProductSpecs } from './product-specs.ts';

describe('normalizeProductSpecs', () => {
  it('ma`lum kalit va o`z nomli xususiyat', () => {
    const r = normalizeProductSpecs([
      { key: 'material', value: '  paxta   95% ' },
      { label: 'Yoqa turi', value: 'Polo' },
    ]);
    expect(r).toEqual({
      ok: true,
      specs: [
        { key: 'material', value: 'paxta 95%' },
        { label: 'Yoqa turi', value: 'Polo' },
      ],
    });
  });

  it('bo`sh qiymatli qator jim tashlanadi', () => {
    const r = normalizeProductSpecs([{ key: 'season', value: ' ' }]);
    expect(r).toEqual({ ok: true, specs: [] });
  });

  it('nomsiz va kalitsiz xususiyat — xato', () => {
    expect(normalizeProductSpecs([{ value: 'x' }]).ok).toBe(false);
  });

  it('noma`lum kalit — xato', () => {
    expect(normalizeProductSpecs([{ key: 'rang', value: 'qizil' }]).ok).toBe(false);
  });

  it('bir kalit ikki marta — xato', () => {
    const r = normalizeProductSpecs([
      { key: 'material', value: 'paxta' },
      { key: 'material', value: 'jun' },
    ]);
    expect(r.ok).toBe(false);
  });

  it('juda uzun qiymat va ortiqcha qatorlar — xato', () => {
    expect(normalizeProductSpecs([{ key: 'care', value: 'x'.repeat(201) }]).ok).toBe(false);
    const many = Array.from({ length: MAX_PRODUCT_SPECS + 1 }, (_, i) => ({
      label: `L${i}`,
      value: 'v',
    }));
    expect(normalizeProductSpecs(many).ok).toBe(false);
  });

  it('null — bo`sh ro`yxat; ro`yxat emas — xato', () => {
    expect(normalizeProductSpecs(null)).toEqual({ ok: true, specs: [] });
    expect(normalizeProductSpecs('material').ok).toBe(false);
  });
});

describe('readProductSpecs', () => {
  it('buzuq yozuvlar tashlanadi, sahifa yiqilmaydi', () => {
    expect(
      readProductSpecs([
        { key: 'country', value: 'O`zbekiston' },
        { key: 'noma`lum', value: 'x' },
        { label: '', value: 'y' },
        42,
        null,
        { label: 'Yoqa', value: 'Polo' },
      ]),
    ).toEqual([
      { key: 'country', value: 'O`zbekiston' },
      { label: 'Yoqa', value: 'Polo' },
    ]);
    expect(readProductSpecs({ material: 'x' })).toEqual([]);
  });
});
