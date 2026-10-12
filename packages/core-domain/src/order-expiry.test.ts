import { describe, expect, it } from 'vitest';

import { isUnpaidOrderExpired, unpaidOrderDeadline } from './order-expiry.ts';

const H = 60 * 60 * 1000;
const placedAt = new Date('2026-10-12T00:00:00Z');
const at = (hours: number) => new Date(placedAt.getTime() + hours * H);

describe('isUnpaidOrderExpired', () => {
  it('Click/Payme — 12 soatdan keyin', () => {
    const o = { status: 'PENDING', placedAt, paidAt: null, payments: [] };
    expect(isUnpaidOrderExpired(o, at(11.9))).toBe(false);
    expect(isUnpaidOrderExpired(o, at(12))).toBe(true);
  });

  it('CONFIRMED (admin tasdiqlagan, lekin to‘lanmagan) ham', () => {
    const o = { status: 'CONFIRMED', placedAt, paidAt: null, payments: [] };
    expect(isUnpaidOrderExpired(o, at(13))).toBe(true);
  });

  it('to‘langan, naqd yoki tekshiruvdagi chek — hech qachon', () => {
    expect(
      isUnpaidOrderExpired({ status: 'PENDING', placedAt, paidAt: at(1), payments: [] }, at(100)),
    ).toBe(false);
    expect(
      isUnpaidOrderExpired(
        {
          status: 'PENDING',
          placedAt,
          paidAt: null,
          payments: [{ provider: 'CASH_ON_DELIVERY', status: 'PENDING' }],
        },
        at(100),
      ),
    ).toBe(false);
    expect(
      isUnpaidOrderExpired(
        {
          status: 'PENDING',
          placedAt,
          paidAt: null,
          payments: [{ provider: 'UZCARD', status: 'PENDING' }],
        },
        at(100),
      ),
    ).toBe(false);
  });

  it('ochiq Payme tranzaksiyasi — tegilmaydi (Payme o‘zi bekor qiladi)', () => {
    expect(
      isUnpaidOrderExpired(
        {
          status: 'PENDING',
          placedAt,
          paidAt: null,
          payments: [{ provider: 'PAYME', status: 'PENDING' }],
        },
        at(100),
      ),
    ).toBe(false);
  });

  it('rad etilgan chek — rad etilgandan 24 soat', () => {
    const o = {
      status: 'PENDING',
      placedAt,
      paidAt: null,
      payments: [{ provider: 'UZCARD', status: 'FAILED', failedAt: at(20) }],
    };
    expect(unpaidOrderDeadline(o)?.toISOString()).toBe(at(44).toISOString());
    expect(isUnpaidOrderExpired(o, at(43))).toBe(false);
    expect(isUnpaidOrderExpired(o, at(44))).toBe(true);
  });

  it('jo‘natilgan yoki yopilgan buyurtma — yo‘q', () => {
    for (const status of ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']) {
      expect(isUnpaidOrderExpired({ status, placedAt, paidAt: null, payments: [] }, at(100))).toBe(
        false,
      );
    }
  });
});
