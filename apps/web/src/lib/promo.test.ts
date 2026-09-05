import { Prisma } from '@ecom/database';
import { describe, expect, it } from 'vitest';

import { evaluatePromo, promoFailMessage, type PromoContext } from './promo';

// `evaluatePromo` PromoCode qatorining bir qismini oladi. Production'da pul
// maydonlari Prisma.Decimal bo'lib keladi — testda ham shundoq beramiz,
// aks holda test haqiqiy chaqiruvdan farq qilib qolardi.
type PromoArg = Parameters<typeof evaluatePromo>[0];

/** Testda son yozish qulay; Decimal'ga shu yerda o'giriladi. */
type PromoOverride = Partial<
  Omit<PromoArg, 'value' | 'minOrderTotal' | 'maxDiscount'> & {
    value: number;
    minOrderTotal: number | null;
    maxDiscount: number | null;
  }
>;

const dec = (n: number | null | undefined) => (n == null ? null : new Prisma.Decimal(n));

function promo(over: PromoOverride = {}): PromoArg {
  const { value, minOrderTotal, maxDiscount, ...rest } = over;
  return {
    code: 'WELCOME10',
    type: 'PERCENT',
    usageLimit: null,
    usagePerUser: 1,
    usedCount: 0,
    startsAt: null,
    endsAt: null,
    isActive: true,
    ...rest,
    value: new Prisma.Decimal(value ?? 10),
    minOrderTotal: dec(minOrderTotal),
    maxDiscount: dec(maxDiscount),
  };
}

function ctx(over: Partial<PromoContext> = {}): PromoContext {
  return { subtotal: 1_000_000, shippingFee: 25_000, ...over };
}

const NOW = new Date('2026-09-05T12:00:00.000Z');
const YESTERDAY = new Date('2026-09-04T12:00:00.000Z');
const TOMORROW = new Date('2026-09-06T12:00:00.000Z');

describe('evaluatePromo — chegirma hisobi', () => {
  it('PERCENT: 1 000 000 dan 10% = 100 000', () => {
    const r = evaluatePromo(promo(), ctx(), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.discount).toBe(100_000);
      expect(r.code).toBe('WELCOME10');
    }
  });

  it('FIXED: qiymat qanday bo‘lsa shunday', () => {
    const r = evaluatePromo(promo({ type: 'FIXED', value: 50_000 }), ctx(), NOW);
    expect(r.ok && r.discount).toBe(50_000);
  });

  it('FREE_SHIPPING: chegirma aynan yetkazish narxiga teng', () => {
    const r = evaluatePromo(
      promo({ type: 'FREE_SHIPPING', value: 0 }),
      ctx({ shippingFee: 25_000 }),
      NOW,
    );
    expect(r.ok && r.discount).toBe(25_000);
  });

  it('FREE_SHIPPING: yetkazish bepul bo‘lsa chegirma ham 0', () => {
    const r = evaluatePromo(
      promo({ type: 'FREE_SHIPPING', value: 0 }),
      ctx({ shippingFee: 0 }),
      NOW,
    );
    expect(r.ok && r.discount).toBe(0);
  });

  it('maxDiscount chegirmani cheklaydi', () => {
    const r = evaluatePromo(promo({ value: 50, maxDiscount: 30_000 }), ctx(), NOW);
    // 50% = 500 000, lekin shift 30 000
    expect(r.ok && r.discount).toBe(30_000);
  });

  it('chegirma subtotal‘dan oshmaydi (mijozga pul qaytarilmaydi)', () => {
    const r = evaluatePromo(
      promo({ type: 'FIXED', value: 999_000_000 }),
      ctx({ subtotal: 100_000 }),
      NOW,
    );
    expect(r.ok && r.discount).toBeLessThanOrEqual(100_000);
  });
});

describe('evaluatePromo — rad etish sabablari', () => {
  it('faol emas', () => {
    const r = evaluatePromo(promo({ isActive: false }), ctx(), NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('INACTIVE');
  });

  it('hali boshlanmagan', () => {
    const r = evaluatePromo(promo({ startsAt: TOMORROW }), ctx(), NOW);
    expect(!r.ok && r.reason).toBe('NOT_STARTED');
  });

  it('muddati tugagan', () => {
    const r = evaluatePromo(promo({ endsAt: YESTERDAY }), ctx(), NOW);
    expect(!r.ok && r.reason).toBe('EXPIRED');
  });

  it('umumiy limit tugagan', () => {
    const r = evaluatePromo(promo({ usageLimit: 100, usedCount: 100 }), ctx(), NOW);
    expect(!r.ok && r.reason).toBe('USAGE_LIMIT');
  });

  it('foydalanuvchi limiti tugagan', () => {
    const r = evaluatePromo(promo({ usagePerUser: 1 }), ctx({ userUsedCount: 1 }), NOW);
    expect(!r.ok && r.reason).toBe('USER_LIMIT');
  });

  it('minimal summa yetmadi — yetishmayotgan chegara qaytariladi', () => {
    const r = evaluatePromo(promo({ minOrderTotal: 500_000 }), ctx({ subtotal: 100_000 }), NOW);
    expect(!r.ok && r.reason).toBe('MIN_ORDER');
    if (!r.ok) expect(r.minOrderTotal).toBe(500_000);
  });

  it('minimal summa aynan chegaraga teng bo‘lsa — o‘tadi', () => {
    const r = evaluatePromo(promo({ minOrderTotal: 500_000 }), ctx({ subtotal: 500_000 }), NOW);
    expect(r.ok).toBe(true);
  });

  it('login qilmagan mijozda foydalanuvchi limiti tekshirilmaydi', () => {
    // userUsedCount berilmagan — limit qo'llanmaydi (mehmon uchun)
    const r = evaluatePromo(promo({ usagePerUser: 1 }), ctx(), NOW);
    expect(r.ok).toBe(true);
  });
});

describe('promoFailMessage', () => {
  it('har bir sabab uchun mijozga tushunarli matn bor', () => {
    const reasons = [
      'NOT_FOUND',
      'INACTIVE',
      'NOT_STARTED',
      'EXPIRED',
      'MIN_ORDER',
      'USAGE_LIMIT',
      'USER_LIMIT',
    ] as const;
    for (const reason of reasons) {
      const msg = promoFailMessage(reason);
      expect(msg.length).toBeGreaterThan(0);
      // Xom kalit chiqib qolmasin
      expect(msg).not.toBe(reason);
    }
  });
});
