import { describe, expect, it } from 'vitest';

import { applyDiscount, discountPercent, formatMoney } from './money.ts';

// UZS formati ATAYLAB uzilmas probel ishlatadi (U+00A0): "1 490 000 so'm"
// qatori satr oxirida bo'linib ketmasin. Oddiy probel bilan yozilgan test
// ko'z bilan bir xil ko'rinadi, lekin yiqiladi — shuning uchun aniq belgi.
const NBSP = ' ';

describe('formatMoney', () => {
  it("UZS ni probel bilan guruhlaydi va so'm qo'shadi", () => {
    expect(formatMoney(1490000)).toBe(`1${NBSP}490${NBSP}000${NBSP}so'm`);
    expect(formatMoney(990000)).toBe(`990${NBSP}000${NBSP}so'm`);
    expect(formatMoney(0)).toBe(`0${NBSP}so'm`);
  });

  it('UZS da kasr qismini yaxlitlaydi (tiyin yo`q)', () => {
    expect(formatMoney(1490000.4)).toBe(`1${NBSP}490${NBSP}000${NBSP}so'm`);
    expect(formatMoney(1490000.6)).toBe(`1${NBSP}490${NBSP}001${NBSP}so'm`);
  });

  it('USD va EUR da ikki kasr va vergul ishlatadi', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50');
    expect(formatMoney(1234.5, 'EUR')).toBe('€1,234.50');
  });

  it('manfiy summada ishorani saqlaydi', () => {
    expect(formatMoney(-5000)).toBe(`-5${NBSP}000${NBSP}so'm`);
  });

  // SSR va brauzer bir xil satr chiqarishi SHART — aks holda hydration
  // mos kelmaydi. Shuning uchun Intl emas, qo'lda formatlash ishlatilgan.
  it('ajratgich sifatida uzilmas probel ishlatadi', () => {
    expect(formatMoney(1000)).toContain(NBSP);
    expect(formatMoney(1000)).not.toContain(' ');
  });

  it('uch xonadan kam sonlarni guruhlamaydi', () => {
    expect(formatMoney(999)).toBe(`999${NBSP}so'm`);
    expect(formatMoney(1000)).toBe(`1${NBSP}000${NBSP}so'm`);
  });
});

describe('discountPercent', () => {
  it('eski narx yangisidan katta bo`lganda foizni qaytaradi', () => {
    expect(discountPercent(2450000, 2890000)).toBe(15);
    expect(discountPercent(50, 100)).toBe(50);
  });

  it('eski narx yo`q, teng yoki kichik bo`lsa 0', () => {
    expect(discountPercent(1000)).toBe(0);
    expect(discountPercent(1000, null)).toBe(0);
    expect(discountPercent(1000, 1000)).toBe(0);
    expect(discountPercent(1000, 900)).toBe(0);
  });

  it('butun songacha yaxlitlaydi', () => {
    // 100 -> 67 = 33% (aniqrog'i 33.0), 100 -> 66 = 34%
    expect(discountPercent(67, 100)).toBe(33);
    expect(discountPercent(66, 100)).toBe(34);
  });
});

describe('applyDiscount', () => {
  it('foizni narxdan ayiradi', () => {
    expect(applyDiscount(1000, 20)).toBe(800);
  });

  it('nol yoki manfiy foizda narx o`zgarmaydi', () => {
    expect(applyDiscount(1000, 0)).toBe(1000);
    expect(applyDiscount(1000, -5)).toBe(1000);
  });

  it('natija hech qachon manfiy bo`lmaydi', () => {
    expect(applyDiscount(1000, 150)).toBe(0);
  });
});
