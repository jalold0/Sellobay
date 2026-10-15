import { describe, expect, it } from 'vitest';

import {
  UZ_REGIONS,
  regionAllowsHomeDelivery,
  regionName,
  regionSlugFromText,
} from './uz-regions.ts';
import { looksLikeTashkentCityText } from './zone.ts';

describe('UZ_REGIONS', () => {
  it('14 ta hudud, slug takrorlanmaydi', () => {
    expect(UZ_REGIONS).toHaveLength(14);
    expect(new Set(UZ_REGIONS.map((r) => r.slug)).size).toBe(14);
  });

  it('uygacha yetkazish faqat Toshkent shahrida', () => {
    expect(regionAllowsHomeDelivery('toshkent-shahri')).toBe(true);
    expect(regionAllowsHomeDelivery('toshkent-viloyati')).toBe(false);
    expect(regionAllowsHomeDelivery('samarqand')).toBe(false);
  });

  it('buyurtmaga yoziladigan nom', () => {
    expect(regionName('fargona')).toBe("Farg'ona viloyati");
  });
});

describe('regionSlugFromText', () => {
  it.each([
    ['Toshkent', 'Toshkent', 'toshkent-shahri'],
    ['Tashkent', '', 'toshkent-shahri'],
    ['Toshkent shahri', 'Yunusobod', 'toshkent-shahri'],
    ['Toshkent viloyati', 'Chirchiq', 'toshkent-viloyati'],
    ['Ташкентская область', 'Ангрен', 'toshkent-viloyati'],
    ["Farg'ona", "Farg'ona", 'fargona'],
    ['Фергана', '', 'fargona'],
    ['Samarqand', 'Samarqand', 'samarqand'],
    ['', 'Nukus', 'qoraqalpogiston'],
    ['Qashqadaryo viloyati', 'Qarshi', 'qashqadaryo'],
  ])('%s / %s → %s', (region, city, expected) => {
    expect(regionSlugFromText(region, city)).toBe(expected);
  });

  it('noma`lum matn — null', () => {
    expect(regionSlugFromText('Moskva', '')).toBeNull();
  });
});

describe('looksLikeTashkentCityText', () => {
  it('viloyat shahar deb hisoblanmaydi', () => {
    expect(looksLikeTashkentCityText('Toshkent viloyati', 'Chirchiq')).toBe(false);
    expect(looksLikeTashkentCityText('Ташкентская область', 'Ангрен')).toBe(false);
  });

  it('shahar — ha', () => {
    expect(looksLikeTashkentCityText('Toshkent shahri', 'Yunusobod')).toBe(true);
    expect(looksLikeTashkentCityText('Toshkent', 'Toshkent')).toBe(true);
  });
});
