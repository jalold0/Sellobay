import { describe, expect, it } from 'vitest';

import { carrierEventsFor, CARRIER_EVENT_RULES, isValidTrackingNumber } from './carrier.ts';

describe('carrierEventsFor', () => {
  it("3PL'ga faqat hamma tovar omborda (PACKED) bo‘lganda topshiriladi", () => {
    expect(carrierEventsFor('PACKED', false)).toEqual(['HANDED_OVER']);
    expect(carrierEventsFor('PAID', false)).toEqual([]);
    expect(carrierEventsFor('SHIPPED', false)).toEqual([]);
  });
  it('topshirilgandan keyin — yo‘lda, yetkazildi yoki rad etildi', () => {
    expect(carrierEventsFor('SHIPPED', true)).toEqual(['OUT_FOR_DELIVERY', 'DELIVERED', 'REFUSED']);
    expect(carrierEventsFor('OUT_FOR_DELIVERY', true)).toEqual(['DELIVERED', 'REFUSED']);
    expect(carrierEventsFor('DELIVERED', true)).toEqual([]);
    expect(carrierEventsFor('RETURNED', true)).toEqual([]);
  });
  it('rad etish — buyurtma qaytarilgan, yetkazish muvaffaqiyatsiz', () => {
    expect(CARRIER_EVENT_RULES.REFUSED).toMatchObject({ order: 'RETURNED', delivery: 'FAILED' });
  });
});

describe('isValidTrackingNumber', () => {
  it('oddiy trek raqamlari', () => {
    expect(isValidTrackingNumber('FRG-12345678')).toBe(true);
    expect(isValidTrackingNumber(' 1Z999AA10123456784 ')).toBe(true);
  });
  it('bo‘sh, qisqa yoki begona belgilar — yo‘q', () => {
    expect(isValidTrackingNumber('')).toBe(false);
    expect(isValidTrackingNumber('abc')).toBe(false);
    expect(isValidTrackingNumber('12 34 56')).toBe(false);
    expect(isValidTrackingNumber('<script>')).toBe(false);
  });
});
