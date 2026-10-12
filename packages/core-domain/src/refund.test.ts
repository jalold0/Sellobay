import { describe, expect, it } from 'vitest';

import { centsToMoney, decideRefund, moneyToCents, refundRemaining } from './refund.ts';

const paid = {
  status: 'RETURNED',
  paidAt: new Date(),
  paidTotal: '250000.00',
  grandTotal: '250000.00',
  refundedTotal: '0.00',
};

describe('moneyToCents / centsToMoney', () => {
  it('float xatosiz', () => {
    expect(moneyToCents('0.1') + moneyToCents('0.2')).toBe(moneyToCents('0.3'));
    expect(centsToMoney(moneyToCents('125000.5'))).toBe('125000.50');
    expect(centsToMoney(0n)).toBe('0.00');
  });
});

describe('refundRemaining', () => {
  it('qaytarilgan/bekor qilingan to‘langan buyurtma — to‘liq summa', () => {
    expect(refundRemaining(paid)).toBe('250000.00');
    expect(refundRemaining({ ...paid, status: 'CANCELLED' })).toBe('250000.00');
  });
  it('paidTotal yozilmagan (0) — grandTotal olinadi', () => {
    expect(refundRemaining({ ...paid, paidTotal: '0.00' })).toBe('250000.00');
  });
  it('qisman qaytarilgan — qoldiq', () => {
    expect(refundRemaining({ ...paid, refundedTotal: '100000.00' })).toBe('150000.00');
  });
  it('to‘lanmagan, faol yoki allaqachon REFUNDED — 0', () => {
    expect(refundRemaining({ ...paid, paidAt: null })).toBe('0.00');
    expect(refundRemaining({ ...paid, status: 'DELIVERED' })).toBe('0.00');
    expect(refundRemaining({ ...paid, status: 'REFUNDED' })).toBe('0.00');
  });
});

describe('decideRefund', () => {
  it('to‘liq qaytarish', () => {
    expect(decideRefund(paid, '250000')).toEqual({
      ok: true,
      newRefundedTotal: '250000.00',
      fullyRefunded: true,
    });
  });
  it('qisman, keyin qolgani', () => {
    const first = decideRefund(paid, '100000');
    expect(first).toMatchObject({ ok: true, fullyRefunded: false, newRefundedTotal: '100000.00' });
    const second = decideRefund({ ...paid, refundedTotal: '100000.00' }, '150000.00');
    expect(second).toMatchObject({ ok: true, fullyRefunded: true });
  });
  it('qoldiqdan ko‘p, nol yoki axlat — rad', () => {
    expect(decideRefund(paid, '250000.01')).toMatchObject({ ok: false, code: 'EXCEEDS_REMAINING' });
    expect(decideRefund(paid, '0')).toMatchObject({ ok: false, code: 'INVALID_AMOUNT' });
    expect(decideRefund(paid, 'abc')).toMatchObject({ ok: false, code: 'INVALID_AMOUNT' });
    expect(decideRefund({ ...paid, paidAt: null }, '1')).toMatchObject({
      ok: false,
      code: 'NOT_REFUNDABLE',
    });
  });
});
