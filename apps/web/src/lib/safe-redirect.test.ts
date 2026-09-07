import { describe, expect, it } from 'vitest';

import { safeInternalPath } from './safe-redirect';

describe('safeInternalPath — ichki yo‘llar o‘tadi', () => {
  it('oddiy yo‘l', () => {
    expect(safeInternalPath('/uz/profile')).toBe('/uz/profile');
  });

  it('query bilan', () => {
    expect(safeInternalPath('/uz/orders?tab=all&page=2')).toBe('/uz/orders?tab=all&page=2');
  });

  it('bosh sahifa', () => {
    expect(safeInternalPath('/')).toBe('/');
  });
});

describe('safeInternalPath — tashqi manzillar rad etiladi (open redirect)', () => {
  it('mutlaq https manzil', () => {
    expect(safeInternalPath('https://evil.com')).toBe('/');
  });

  it('mutlaq http manzil', () => {
    expect(safeInternalPath('http://evil.com/path')).toBe('/');
  });

  it('protokol-nisbiy manzil — brauzer uni TASHQI deb oladi', () => {
    expect(safeInternalPath('//evil.com')).toBe('/');
    expect(safeInternalPath('//evil.com/uz/profile')).toBe('/');
  });

  it('backslash hiylasi — ba‘zi brauzerlar \\ ni / deb talqin qiladi', () => {
    expect(safeInternalPath('/\\evil.com')).toBe('/');
    expect(safeInternalPath('/\\\\evil.com')).toBe('/');
    expect(safeInternalPath('\\\\evil.com')).toBe('/');
  });

  it('sxema bilan boshlanuvchi boshqa protokollar', () => {
    expect(safeInternalPath('javascript:alert(1)')).toBe('/');
    expect(safeInternalPath('data:text/html,x')).toBe('/');
  });

  it('nisbiy yo‘l (/ bilan boshlanmaydi) rad etiladi', () => {
    expect(safeInternalPath('uz/profile')).toBe('/');
    expect(safeInternalPath('../admin')).toBe('/');
  });
});

describe('safeInternalPath — bo‘sh qiymatlar', () => {
  it('null / undefined / bo‘sh satr → bosh sahifa', () => {
    expect(safeInternalPath(null)).toBe('/');
    expect(safeInternalPath(undefined)).toBe('/');
    expect(safeInternalPath('')).toBe('/');
  });
});
