import { describe, expect, it } from 'vitest';

import { isUuid, onlyUuids } from './uuid.ts';

const REAL = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('isUuid', () => {
  it('haqiqiy UUID qabul qiladi', () => {
    expect(isUuid(REAL)).toBe(true);
  });

  it('katta harflarni ham qabul qiladi', () => {
    expect(isUuid(REAL.toUpperCase())).toBe(true);
  });

  it("mock katalogning 'g-' id'sini rad etadi", () => {
    // Aynan shu holat uchun kerak: dev mock id'si serverga ketsa
    // z.string().uuid() BUTUN so'rovni rad etadi.
    expect(isUuid('g-nike-air-max')).toBe(false);
  });

  it('shakli buzilganlarni rad etadi', () => {
    expect(isUuid('')).toBe(false);
    expect(isUuid('3f2504e0-4f89-41d3-9a0c')).toBe(false);
    expect(isUuid(`${REAL}-extra`)).toBe(false);
    expect(isUuid(` ${REAL}`)).toBe(false);
    expect(isUuid('zf2504e0-4f89-41d3-9a0c-0305e82c3301')).toBe(false);
  });

  it('satr bo`lmaganlarni rad etadi', () => {
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(42)).toBe(false);
    expect(isUuid({})).toBe(false);
  });
});

describe('onlyUuids', () => {
  it('mock id`larni tashlab, haqiqiylarni qoldiradi', () => {
    expect(onlyUuids([REAL, 'g-mock', null, 7])).toEqual([REAL]);
  });

  it('takrorlarni olib tashlaydi', () => {
    expect(onlyUuids([REAL, REAL])).toEqual([REAL]);
  });

  it('tartibni saqlaydi', () => {
    const other = '00000000-0000-4000-8000-000000000000';
    expect(onlyUuids([other, REAL])).toEqual([other, REAL]);
  });

  it('bo`sh ro`yxatda bo`sh qaytaradi', () => {
    expect(onlyUuids([])).toEqual([]);
  });
});
