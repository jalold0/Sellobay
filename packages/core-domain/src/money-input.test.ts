import { describe, expect, it } from 'vitest';

import { compareMoney, isValidCompareAtPrice, parseMoneyInput } from './money-input.ts';

describe('parseMoneyInput', () => {
  it('to‘g‘ri qiymatlar o‘nlik satrga', () => {
    expect(parseMoneyInput('125000')).toBe('125000');
    expect(parseMoneyInput(125000)).toBe('125000');
    expect(parseMoneyInput('1 250 000')).toBe('1250000');
    expect(parseMoneyInput('1,250,000.50')).toBe('1250000.50');
    expect(parseMoneyInput('99,9')).toBe('99.9');
    expect(parseMoneyInput('007')).toBe('7');
  });

  it('NaN, Infinity, manfiy, nol va axlat — rad', () => {
    for (const v of [
      'abc',
      '',
      ' ',
      '-5',
      '0',
      '0.00',
      '1e5',
      'Infinity',
      NaN,
      Infinity,
      -1,
      null,
      undefined,
      {},
      '1.234',
    ]) {
      expect(parseMoneyInput(v)).toBeNull();
    }
  });

  it('juda katta summa — rad (Decimal(14,2) ga sig‘maydi)', () => {
    expect(parseMoneyInput('1000000000000')).toBeNull();
    expect(parseMoneyInput('999999999999.99')).toBe('999999999999.99');
  });
});

describe('isValidCompareAtPrice', () => {
  it('eski narx yangidan katta bo‘lsagina', () => {
    expect(isValidCompareAtPrice('100000', '120000')).toBe(true);
    expect(isValidCompareAtPrice('100000', '100000')).toBe(false);
    expect(isValidCompareAtPrice('100000', '90000')).toBe(false);
    expect(isValidCompareAtPrice('100000', null)).toBe(true);
  });

  it('compareMoney float xatosiz', () => {
    expect(compareMoney('0.3', '0.30')).toBe(0);
    expect(compareMoney('10.05', '10.5')).toBe(-1);
  });
});
