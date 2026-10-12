import { describe, expect, it } from 'vitest';

import { countsAsRevenue } from './revenue.ts';
import { lastTashkentDays, tashkentDateKey, tashkentDayStart } from './tashkent-time.ts';

describe('countsAsRevenue', () => {
  it('to‘langan va faol buyurtma — daromad (oraliq holatlar ham)', () => {
    for (const status of [
      'PAID',
      'CONFIRMED',
      'PROCESSING',
      'PACKED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ]) {
      expect(countsAsRevenue({ paidAt: new Date(), status })).toBe(true);
    }
  });
  it('to‘lanmagan yoki bekor/qaytarilgan — yo‘q', () => {
    expect(countsAsRevenue({ paidAt: null, status: 'DELIVERED' })).toBe(false);
    for (const status of ['CANCELLED', 'RETURNED', 'REFUNDED']) {
      expect(countsAsRevenue({ paidAt: new Date(), status })).toBe(false);
    }
  });
});

describe('Toshkent kuni', () => {
  it('UTC 20:00 — Toshkentda ertangi kun', () => {
    expect(tashkentDateKey('2026-10-04T20:00:00Z')).toBe('2026-10-05');
    expect(tashkentDateKey('2026-10-04T18:59:59Z')).toBe('2026-10-04');
  });
  it('kun boshi UTC 19:00', () => {
    expect(tashkentDayStart(new Date('2026-10-04T03:00:00Z')).toISOString()).toBe(
      '2026-10-03T19:00:00.000Z',
    );
  });
  it('oxirgi N kun — bugun bilan tugaydi', () => {
    expect(lastTashkentDays(3, new Date('2026-10-04T20:00:00Z'))).toEqual([
      '2026-10-03',
      '2026-10-04',
      '2026-10-05',
    ]);
  });
});
