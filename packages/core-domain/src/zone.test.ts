import { describe, expect, it } from 'vitest';

import { TASHKENT_CITY_BBOX, isInTashkentCity, looksLikeTashkentCityText } from './zone.ts';

describe('isInTashkentCity (bbox)', () => {
  it('shahar markazi ichida (41.30, 69.24)', () => {
    expect(isInTashkentCity(41.3, 69.24)).toBe(true);
  });

  it('chegara qiymatlari INKLYUZIV', () => {
    expect(isInTashkentCity(TASHKENT_CITY_BBOX.latMin, TASHKENT_CITY_BBOX.lngMin)).toBe(true);
    expect(isInTashkentCity(TASHKENT_CITY_BBOX.latMax, TASHKENT_CITY_BBOX.lngMax)).toBe(true);
  });

  it('Samarqand (39.65, 66.96) tashqarida', () => {
    expect(isInTashkentCity(39.65, 66.96)).toBe(false);
  });

  it('faqat bitta o‘q ichida bo‘lsa ham tashqarida', () => {
    expect(isInTashkentCity(41.3, 70.0)).toBe(false); // lat ichida, lng tashqarida
    expect(isInTashkentCity(40.0, 69.24)).toBe(false); // lng ichida, lat tashqarida
  });
});

describe('looksLikeTashkentCityText (matn heuristikasi)', () => {
  it('lotin/ingliz/kirill variantlarini taniydi (katta-kichik harf farqsiz)', () => {
    expect(looksLikeTashkentCityText('Toshkent', 'Yunusobod')).toBe(true);
    expect(looksLikeTashkentCityText('', 'TASHKENT')).toBe(true);
    expect(looksLikeTashkentCityText('Ташкент', '')).toBe(true);
  });

  it('viloyat shaharlari rad etiladi', () => {
    expect(looksLikeTashkentCityText('Samarqand', 'Samarqand')).toBe(false);
    expect(looksLikeTashkentCityText('Farg‘ona', 'Qo‘qon')).toBe(false);
    expect(looksLikeTashkentCityText('', '')).toBe(false);
  });

  it('hujjatlashtirilgan chekka holat: "Toshkent viloyati" ham qabul qilinadi', () => {
    // Ataylab shunday (kuryer ops hal qiladi) — o‘zgarsa bu test signal beradi
    expect(looksLikeTashkentCityText('Toshkent viloyati', 'Chirchiq')).toBe(true);
  });
});
