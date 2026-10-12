import { describe, expect, it } from 'vitest';

import {
  adminFulfillmentTargets,
  canAdminCancel,
  canResubmitReceipt,
  canAdminTransition,
  FULFILLMENT_FLOW,
  orderPaymentState,
  settlesCodPayment,
  type OrderPaymentState,
} from './order-fulfillment.ts';

const STATES: OrderPaymentState[] = ['PAID', 'COD_PENDING', 'AWAITING_PAYMENT'];

describe('orderPaymentState', () => {
  it('paidAt bo‘lsa — PAID', () => {
    expect(orderPaymentState({ paidAt: new Date(), payments: [] })).toBe('PAID');
  });

  it('PAID to‘lov yozuvi bo‘lsa — PAID (paidAt bo‘lmasa ham)', () => {
    expect(
      orderPaymentState({ paidAt: null, payments: [{ provider: 'CLICK', status: 'PAID' }] }),
    ).toBe('PAID');
  });

  it('kutilayotgan naqd to‘lov — COD_PENDING', () => {
    expect(
      orderPaymentState({
        paidAt: null,
        payments: [{ provider: 'CASH_ON_DELIVERY', status: 'PENDING' }],
      }),
    ).toBe('COD_PENDING');
  });

  it('UZCARD cheki tasdiqlanmagan — AWAITING_PAYMENT', () => {
    expect(
      orderPaymentState({ paidAt: null, payments: [{ provider: 'UZCARD', status: 'PENDING' }] }),
    ).toBe('AWAITING_PAYMENT');
  });

  it('Click/Payme webhook hali kelmagan (yozuv yo‘q) — AWAITING_PAYMENT', () => {
    expect(orderPaymentState({ paidAt: null, payments: [] })).toBe('AWAITING_PAYMENT');
  });

  it('rad etilgan yoki bekor to‘lov pul hisoblanmaydi', () => {
    expect(
      orderPaymentState({
        paidAt: null,
        payments: [
          { provider: 'UZCARD', status: 'FAILED' },
          { provider: 'PAYME', status: 'CANCELLED' },
        ],
      }),
    ).toBe('AWAITING_PAYMENT');
  });
});

describe('adminFulfillmentTargets', () => {
  it('PAID hech qachon qo‘lda qo‘yilmaydi', () => {
    for (const current of FULFILLMENT_FLOW) {
      for (const state of STATES) {
        expect(adminFulfillmentTargets(current, state)).not.toContain('PAID');
      }
    }
  });

  it('to‘lanmagan oldindan-to‘lovli buyurtma faqat CONFIRMED gacha', () => {
    expect(adminFulfillmentTargets('PENDING', 'AWAITING_PAYMENT')).toEqual(['CONFIRMED']);
    expect(adminFulfillmentTargets('CONFIRMED', 'AWAITING_PAYMENT')).toEqual([]);
  });

  it('naqd buyurtma to‘lovsiz ham yetkazishgacha suriladi', () => {
    expect(adminFulfillmentTargets('PENDING', 'COD_PENDING')).toEqual([
      'CONFIRMED',
      'PROCESSING',
      'PACKED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ]);
  });

  it('to‘langan buyurtma faqat oldinga', () => {
    expect(adminFulfillmentTargets('PAID', 'PAID')).toEqual([
      'PROCESSING',
      'PACKED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ]);
    expect(adminFulfillmentTargets('SHIPPED', 'PAID')).toEqual(['OUT_FOR_DELIVERY', 'DELIVERED']);
  });

  it('oxirgi va oqimdan tashqari holatlar o‘zgarmaydi', () => {
    expect(adminFulfillmentTargets('DELIVERED', 'PAID')).toEqual([]);
    expect(adminFulfillmentTargets('CANCELLED', 'COD_PENDING')).toEqual([]);
    expect(adminFulfillmentTargets('RETURNED', 'PAID')).toEqual([]);
  });
});

describe('canAdminTransition', () => {
  it('K2: to‘lanmagan buyurtmani to‘g‘ridan DELIVERED qilib bo‘lmaydi', () => {
    expect(canAdminTransition('PENDING', 'DELIVERED', 'AWAITING_PAYMENT')).toBe(false);
    expect(canAdminTransition('CONFIRMED', 'SHIPPED', 'AWAITING_PAYMENT')).toBe(false);
  });

  it('K2: PAID ni qo‘lda qo‘yib bo‘lmaydi', () => {
    for (const state of STATES) {
      expect(canAdminTransition('PENDING', 'PAID', state)).toBe(false);
      expect(canAdminTransition('CONFIRMED', 'PAID', state)).toBe(false);
    }
  });

  it('orqaga qaytib bo‘lmaydi', () => {
    expect(canAdminTransition('SHIPPED', 'PACKED', 'PAID')).toBe(false);
  });

  it('naqd buyurtmani yetkazish mumkin', () => {
    expect(canAdminTransition('PENDING', 'DELIVERED', 'COD_PENDING')).toBe(true);
  });
});

describe('canAdminCancel', () => {
  it('tovar omborda — bekor qilsa bo‘ladi', () => {
    for (const s of ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING', 'PACKED']) {
      expect(canAdminCancel(s)).toBe(true);
    }
  });
  it('yo‘lga chiqqan yoki yopilgan — yo‘q (qaytarish oqimi)', () => {
    for (const s of [
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'RETURNED',
      'REFUNDED',
    ]) {
      expect(canAdminCancel(s)).toBe(false);
    }
  });
});

describe('settlesCodPayment', () => {
  it('faqat naqd buyurtma va faqat DELIVERED da', () => {
    expect(settlesCodPayment('DELIVERED', 'COD_PENDING')).toBe(true);
    expect(settlesCodPayment('SHIPPED', 'COD_PENDING')).toBe(false);
    expect(settlesCodPayment('DELIVERED', 'PAID')).toBe(false);
    expect(settlesCodPayment('DELIVERED', 'AWAITING_PAYMENT')).toBe(false);
  });
});

describe('canResubmitReceipt', () => {
  const rejected = [{ provider: 'UZCARD', status: 'FAILED' }];
  it('rad etilgan chek, to‘lanmagan buyurtma — mumkin', () => {
    expect(canResubmitReceipt({ status: 'PENDING', paidAt: null, payments: rejected })).toBe(true);
    expect(canResubmitReceipt({ status: 'CONFIRMED', paidAt: null, payments: rejected })).toBe(
      true,
    );
  });
  it('tekshiruvdagi chek bor, to‘langan yoki bekor qilingan — yo‘q', () => {
    expect(
      canResubmitReceipt({
        status: 'PENDING',
        paidAt: null,
        payments: [{ provider: 'UZCARD', status: 'PENDING' }, ...rejected],
      }),
    ).toBe(false);
    expect(canResubmitReceipt({ status: 'PENDING', paidAt: new Date(), payments: rejected })).toBe(
      false,
    );
    expect(canResubmitReceipt({ status: 'CANCELLED', paidAt: null, payments: rejected })).toBe(
      false,
    );
  });
  it('boshqa provayder yoki to‘lov yozuvi yo‘q — yo‘q', () => {
    expect(
      canResubmitReceipt({
        status: 'PENDING',
        paidAt: null,
        payments: [{ provider: 'PAYME', status: 'FAILED' }],
      }),
    ).toBe(false);
    expect(canResubmitReceipt({ status: 'PENDING', paidAt: null, payments: [] })).toBe(false);
  });
});
