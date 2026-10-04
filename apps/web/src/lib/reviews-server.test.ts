// Sharh qoidalari.
//
// Prisma soxtalashtiriladi: tekshirilayotgan narsa BAZA emas, qoidalar —
// kim yoza oladi, necha marta, va mahsulot bahosi qanday qayta
// hisoblanadi.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = {
  product: { findUnique: vi.fn(), update: vi.fn() },
  orderItem: { findFirst: vi.fn() },
  review: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
  },
  // Tranzaksiya shu obyektning o'zini beradi — chaqiruvlarni sanash
  // uchun shu yetarli.
  $transaction: vi.fn(),
};

vi.mock('@/lib/db', () => ({ prisma: db }));

const {
  createReview,
  deleteReview,
  reviewEligibility,
  serializeReview,
  ReviewError,
  // eslint-disable-next-line @typescript-eslint/no-require-imports
} = await import('./reviews-server');

const ACTIVE_PRODUCT = { id: 'p1', status: 'ACTIVE' };

/// Birinchi chaqiruvdagi `data` — qat'iy rejimda indeks `undefined`
/// bo'lishi mumkin, shuning uchun bitta joyda ochiladi.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function firstCallData(spy: { mock: { calls: any[][] } }): any {
  const call = spy.mock.calls[0];
  if (!call) throw new Error('chaqiruv bo`lmadi');
  return call[0].data;
}

function reviewRow(over: Record<string, unknown> = {}) {
  return {
    id: 'r1',
    rating: 5,
    title: null,
    body: 'Zo`r',
    images: [],
    isVerifiedPurchase: true,
    helpfulCount: 0,
    createdAt: new Date('2026-10-04T08:00:00.000Z'),
    userId: 'u1',
    user: { firstName: 'Dilnoza', lastName: 'Karimova' },
    ...over,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation(async (fn: (tx: typeof db) => unknown) => fn(db));
  db.review.aggregate.mockResolvedValue({ _avg: { rating: 0 }, _count: { _all: 0 } });
  db.product.update.mockResolvedValue({});
});

describe('muallif ko`rinishi', () => {
  it('familiya TO`LIQ chiqmaydi — faqat bosh harf', () => {
    // Ochiq sharhda to'liq familiya kerak emas va uni qaytarib
    // olib bo'lmaydi.
    expect(serializeReview(reviewRow()).author).toBe('Dilnoza K.');
  });

  it('familiya yo`q bo`lsa faqat ism', () => {
    expect(
      serializeReview(reviewRow({ user: { firstName: 'Dilnoza', lastName: null } })).author,
    ).toBe('Dilnoza');
  });

  it('ism ham yo`q — bo`sh satr, klient o`zi hal qiladi', () => {
    expect(serializeReview(reviewRow({ user: { firstName: null, lastName: null } })).author).toBe(
      '',
    );
  });

  it('telefon va email javobda YO`Q', () => {
    const out = serializeReview(reviewRow());
    expect(Object.keys(out)).not.toContain('phone');
    expect(Object.keys(out)).not.toContain('email');
  });
});

describe('sharh yozish', () => {
  it('sotib olmagan mijoz yoza OLMAYDI', async () => {
    db.product.findUnique.mockResolvedValue(ACTIVE_PRODUCT);
    db.orderItem.findFirst.mockResolvedValue(null);

    await expect(createReview({ userId: 'u1', productId: 'p1', rating: 5 })).rejects.toMatchObject({
      status: 403,
      code: 'NOT_PURCHASED',
    });
    expect(db.review.create).not.toHaveBeenCalled();
  });

  it('ikkinchi sharh yozib bo`lmaydi', async () => {
    db.product.findUnique.mockResolvedValue(ACTIVE_PRODUCT);
    db.orderItem.findFirst.mockResolvedValue({ orderId: 'o1' });
    db.review.findFirst.mockResolvedValue({ id: 'r-old' });

    await expect(createReview({ userId: 'u1', productId: 'p1', rating: 4 })).rejects.toMatchObject({
      status: 409,
      code: 'ALREADY_REVIEWED',
    });
    expect(db.review.create).not.toHaveBeenCalled();
  });

  it('o`chirilgan mahsulotga sharh yozilmaydi', async () => {
    db.product.findUnique.mockResolvedValue({ id: 'p1', status: 'ARCHIVED' });

    await expect(createReview({ userId: 'u1', productId: 'p1', rating: 5 })).rejects.toBeInstanceOf(
      ReviewError,
    );
    expect(db.orderItem.findFirst).not.toHaveBeenCalled();
  });

  it('yozilgan sharh DARHOL ko`rinadi va xaridga bog`lanadi', async () => {
    // Tasdiqlaydigan admin ekrani yo'q — `isApproved: false` qoldirsak
    // sharh hech qachon ko'rinmasdi.
    db.product.findUnique.mockResolvedValue(ACTIVE_PRODUCT);
    db.orderItem.findFirst.mockResolvedValue({ orderId: 'o1' });
    db.review.findFirst.mockResolvedValue(null);
    db.review.create.mockResolvedValue(reviewRow());

    await createReview({ userId: 'u1', productId: 'p1', rating: 5, body: '  Zo`r  ' });

    const data = firstCallData(db.review.create);
    expect(data.isApproved).toBe(true);
    expect(data.isVerifiedPurchase).toBe(true);
    expect(data.orderId).toBe('o1');
    expect(data.body).toBe('Zo`r');
  });

  it('bo`sh matn `null` bo`lib yoziladi', async () => {
    db.product.findUnique.mockResolvedValue(ACTIVE_PRODUCT);
    db.orderItem.findFirst.mockResolvedValue({ orderId: 'o1' });
    db.review.findFirst.mockResolvedValue(null);
    db.review.create.mockResolvedValue(reviewRow());

    await createReview({ userId: 'u1', productId: 'p1', rating: 5, title: '   ', body: '' });

    const data = firstCallData(db.review.create);
    expect(data.title).toBeNull();
    expect(data.body).toBeNull();
  });
});

describe('mahsulot bahosi qayta hisoblanadi', () => {
  it('seed`dagi to`qima raqam HAQIQIYSIGA almashadi', async () => {
    // Seed'da `rating: 4.8, reviewCount: 124` turardi, ortida esa
    // birorta sharh yo'q edi.
    db.product.findUnique.mockResolvedValue(ACTIVE_PRODUCT);
    db.orderItem.findFirst.mockResolvedValue({ orderId: 'o1' });
    db.review.findFirst.mockResolvedValue(null);
    db.review.create.mockResolvedValue(reviewRow());
    db.review.aggregate.mockResolvedValue({ _avg: { rating: 4 }, _count: { _all: 2 } });

    await createReview({ userId: 'u1', productId: 'p1', rating: 4 });

    const data = firstCallData(db.product.update);
    // `Decimal` nollarni qisqartiradi — qiymatni solishtiramiz.
    expect(Number(data.rating)).toBe(4);
    expect(data.reviewCount).toBe(2);
  });

  it('o`rtacha ikki kasrga yaxlitlanadi', async () => {
    // Ustun `Decimal(3,2)`.
    db.product.findUnique.mockResolvedValue(ACTIVE_PRODUCT);
    db.orderItem.findFirst.mockResolvedValue({ orderId: 'o1' });
    db.review.findFirst.mockResolvedValue(null);
    db.review.create.mockResolvedValue(reviewRow());
    db.review.aggregate.mockResolvedValue({
      _avg: { rating: 4.333333333 },
      _count: { _all: 3 },
    });

    await createReview({ userId: 'u1', productId: 'p1', rating: 4 });

    expect(Number(firstCallData(db.product.update).rating)).toBe(4.33);
  });

  it('sharh qolmasa baho NOLGA tushadi', async () => {
    db.review.findUnique.mockResolvedValue({ id: 'r1', userId: 'u1', productId: 'p1' });
    db.review.aggregate.mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } });

    await deleteReview('u1', 'r1');

    const data = firstCallData(db.product.update);
    expect(Number(data.rating)).toBe(0);
    expect(data.reviewCount).toBe(0);
  });
});

describe('o`chirish', () => {
  it('begona sharhni o`chirib bo`lmaydi', async () => {
    db.review.findUnique.mockResolvedValue({ id: 'r1', userId: 'boshqa', productId: 'p1' });

    await expect(deleteReview('u1', 'r1')).rejects.toMatchObject({ status: 403 });
    expect(db.review.delete).not.toHaveBeenCalled();
  });

  it('yo`q sharh — 404', async () => {
    db.review.findUnique.mockResolvedValue(null);

    await expect(deleteReview('u1', 'yo`q')).rejects.toMatchObject({ status: 404 });
  });
});

describe('yozish huquqi', () => {
  it('sotib olgan va hali yozmagan — mumkin', async () => {
    db.orderItem.findFirst.mockResolvedValue({ orderId: 'o1' });
    db.review.findFirst.mockResolvedValue(null);

    expect(await reviewEligibility('u1', 'p1')).toEqual({
      canReview: true,
      hasPurchased: true,
      existingReviewId: null,
    });
  });

  it('allaqachon yozgan — mumkin emas, lekin xaridi bor', async () => {
    db.orderItem.findFirst.mockResolvedValue({ orderId: 'o1' });
    db.review.findFirst.mockResolvedValue({ id: 'r1' });

    expect(await reviewEligibility('u1', 'p1')).toEqual({
      canReview: false,
      hasPurchased: true,
      existingReviewId: 'r1',
    });
  });

  it('sotib olmagan — mumkin emas', async () => {
    db.orderItem.findFirst.mockResolvedValue(null);
    db.review.findFirst.mockResolvedValue(null);

    expect(await reviewEligibility('u1', 'p1')).toMatchObject({
      canReview: false,
      hasPurchased: false,
    });
  });
});
