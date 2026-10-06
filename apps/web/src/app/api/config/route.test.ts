import {
  COIN_PER_SOM,
  COIN_VALUE_SOM,
  EXPRESS_FEE,
  FREE_SHIPPING_THRESHOLD,
  RETURN_WINDOW_DAYS,
  SHIPPING_FEE,
  TIERS,
} from '@ecom/core-domain';
import { locales } from '@ecom/i18n';
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { GET } from './route';

/**
 * Bu endpoint TypeScript bo'lmagan klientlar (Flutter) uchun biznes
 * qoidalarini beradi. Uning butun ma'nosi — qoidalar IKKI JOYDA
 * saqlanmasligi. Shuning uchun test aynan shuni qo'riqlaydi: javobdagi
 * har bir qiymat `@ecom/core-domain` dagi bilan AYNAN bir xil.
 *
 * Kimdir konstantani o'zgartirib, endpointni yangilashni unutsa — shu
 * test yiqiladi va Flutter klienti eskirgan qiymat olib qolmaydi.
 */
describe('GET /api/config', () => {
  /**
   * Javob endi KONVERTDA: `{ success, data }`. Test `data` ni ochib
   * beradi, shunda qolgan tekshiruvlar o'zgarmay qoladi va ular
   * tekshiradigan narsa — qiymatlar `@ecom/core-domain` bilan bir xilmi
   * — o'sha joyida turadi.
   */
  const body = async () => {
    const req = new NextRequest('http://localhost/api/config');
    const json = (await (await GET(req)).json()) as { success: boolean; data: Record<string, any> };
    expect(json.success).toBe(true);
    return json.data;
  };

  it('konvertda keladi — boshqa route`lar bilan BIR XIL', async () => {
    // Ilgari bu yo'l xom javob qaytarardi va Flutter klientida
    // alohida metod (`getRaw`) saqlashga majbur qilardi.
    const req = new NextRequest('http://localhost/api/config');
    const json = (await (await GET(req)).json()) as Record<string, unknown>;
    expect(json).toHaveProperty('success', true);
    expect(json).toHaveProperty('data');
  });

  it('yetkazish narxlari core-domain bilan bir xil', async () => {
    const { shipping } = await body();
    expect(shipping.standardFee).toBe(SHIPPING_FEE);
    expect(shipping.expressFee).toBe(EXPRESS_FEE);
    expect(shipping.freeThreshold).toBe(FREE_SHIPPING_THRESHOLD);
    expect(shipping.currency).toBe('UZS');
  });

  it('loyallik qoidalari core-domain bilan bir xil', async () => {
    const { loyalty } = await body();
    expect(loyalty.coinPerSom).toBe(COIN_PER_SOM);
    expect(loyalty.coinValueSom).toBe(COIN_VALUE_SOM);
    expect(loyalty.tiers).toEqual(TIERS);
  });

  it('qaytarish muddati va tillar', async () => {
    const data = await body();
    expect(data.returns.windowDays).toBe(RETURN_WINDOW_DAYS);
    expect(data.locales).toEqual([...locales]);
  });

  it('Toshkent chegarasi to`liq keladi', async () => {
    const { geo } = await body();
    // To'rt chegara ham bo'lishi shart — bittasi yetishmasa hudud
    // tekshiruvi klientda jim ravishda noto'g'ri ishlaydi.
    expect(Object.keys(geo.tashkentCityBbox).sort()).toEqual([
      'latMax',
      'latMin',
      'lngMax',
      'lngMin',
    ]);
  });

  it('javob JSON sifatida serializatsiya bo`ladi (Dart klienti o`qiy oladi)', async () => {
    const data = await body();
    expect(() => JSON.parse(JSON.stringify(data))).not.toThrow();
  });
});
