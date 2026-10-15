// Sharh qoidalari.
//
// Prisma soxtalashtiriladi: tekshirilayotgan narsa BAZA emas, qoidalar —
// kim yoza oladi, necha marta, va mahsulot bahosi qanday qayta
// hisoblanadi.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = {
  product: { findUnique: vi.fn(), update: vi.fn() },
  seller: { update: vi.fn() },
  orderItem: { findFirst: vi.fn() },
  review: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
    update: vi.fn(),
  },
  reviewVote: { deleteMany: vi.fn(), createMany: vi.fn(), count: vi.fn(), findMany: vi.fn() },
  // Tranzaksiya shu obyektning o'zini beradi — chaqiruvlarni sanash
  // uchun shu yetarli.
  $transaction: vi.fn(),
};

vi.mock('@/lib/db', () => ({ prisma: db }));

const {
  createReview,
  listProductReviews,
  reviewSummary,
  toggleHelpful,
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

describe('suratlar, filtrlar va xulosa', () => {
  it('sharh suratlari takrorlanmasdan saqlanadi', async () => {
    db.product.findUnique.mockResolvedValue(ACTIVE_PRODUCT);
    db.orderItem.findFirst.mockResolvedValue({ orderId: 'o1' });
    db.review.findFirst.mockResolvedValue(null);
    db.review.create.mockResolvedValue(reviewRow());
    const a = 'https://x.public.blob.vercel-storage.com/reviews/a.jpg';

    await createReview({ userId: 'u1', productId: 'p1', rating: 5, images: [a, a] });

    expect(firstCallData(db.review.create).images).toEqual([a]);
  });

  it('yulduz va surat filtri so`rovga qo`shiladi', async () => {
    db.review.findMany.mockResolvedValue([]);
    db.review.count.mockResolvedValue(0);

    await listProductReviews('p1', { rating: 5, withPhotos: true, sort: 'rating-low' });

    const args = db.review.findMany.mock.calls[0]?.[0];
    expect(args.where).toEqual({
      productId: 'p1',
      isApproved: true,
      rating: 5,
      images: { isEmpty: false },
    });
    expect(args.orderBy[0]).toEqual({ rating: 'asc' });
  });

  it('noto`g`ri yulduz e`tiborsiz qoldiriladi', async () => {
    db.review.findMany.mockResolvedValue([]);
    db.review.count.mockResolvedValue(0);
    await listProductReviews('p1', { rating: 9 });
    expect(db.review.findMany.mock.calls[0]?.[0].where).toEqual({
      productId: 'p1',
      isApproved: true,
    });
  });

  it('xulosa BUTUN sharhlardan: taqsimot, o`rtacha, suratlilar', async () => {
    db.review.groupBy.mockResolvedValue([
      { rating: 5, _count: { _all: 3 } },
      { rating: 4, _count: { _all: 1 } },
    ]);
    db.review.count.mockResolvedValue(2);

    const s = await reviewSummary('p1');

    expect(s.breakdown).toEqual({ '1': 0, '2': 0, '3': 0, '4': 1, '5': 3 });
    expect(s.total).toBe(4);
    expect(s.average).toBe(4.8);
    expect(s.withPhotos).toBe(2);
  });
});

describe('do`kon reytingi', () => {
  it('sharhdan keyin do`kon reytingi ham qayta hisoblanadi', async () => {
    db.product.findUnique.mockResolvedValue(ACTIVE_PRODUCT);
    db.orderItem.findFirst.mockResolvedValue({ orderId: 'o1' });
    db.review.findFirst.mockResolvedValue(null);
    db.review.create.mockResolvedValue(reviewRow());
    db.product.update.mockResolvedValue({ sellerId: 's1' });
    db.review.aggregate.mockResolvedValue({ _avg: { rating: 4.666 }, _count: { _all: 3 } });

    await createReview({ userId: 'u1', productId: 'p1', rating: 5 });

    expect(db.review.aggregate.mock.calls[1]?.[0].where).toEqual({
      isApproved: true,
      product: { sellerId: 's1' },
    });
    const update = db.seller.update.mock.calls[0]?.[0];
    expect(update.where).toEqual({ id: 's1' });
    expect(update.data.rating.toString()).toBe('4.67');
  });

  it('sotuvchisiz (platforma) mahsulotda do`kon yangilanmaydi', async () => {
    db.product.findUnique.mockResolvedValue(ACTIVE_PRODUCT);
    db.orderItem.findFirst.mockResolvedValue({ orderId: 'o1' });
    db.review.findFirst.mockResolvedValue(null);
    db.review.create.mockResolvedValue(reviewRow());
    db.product.update.mockResolvedValue({ sellerId: null });

    await createReview({ userId: 'u1', productId: 'p1', rating: 5 });

    expect(db.seller.update).not.toHaveBeenCalled();
  });
});

describe('«foydali» ovozi', () => {
  const APPROVED = { id: 'r1', userId: 'author', isApproved: true };

  it('birinchi bosish — ovoz qo`yiladi, son jadvaldan', async () => {
    db.review.findUnique.mockResolvedValue(APPROVED);
    db.reviewVote.deleteMany.mockResolvedValue({ count: 0 });
    db.reviewVote.createMany.mockResolvedValue({ count: 1 });
    db.reviewVote.count.mockResolvedValue(4);

    const res = await toggleHelpful('u1', 'r1');

    expect(res).toEqual({ helpful: true, helpfulCount: 4 });
    expect(db.reviewVote.createMany.mock.calls[0]?.[0]).toEqual({
      data: [{ reviewId: 'r1', userId: 'u1' }],
      skipDuplicates: true,
    });
    expect(db.review.update.mock.calls[0]?.[0]).toEqual({
      where: { id: 'r1' },
      data: { helpfulCount: 4 },
    });
  });

  it('ikkinchi bosish — ovoz qaytarib olinadi', async () => {
    db.review.findUnique.mockResolvedValue(APPROVED);
    db.reviewVote.deleteMany.mockResolvedValue({ count: 1 });
    db.reviewVote.count.mockResolvedValue(3);

    const res = await toggleHelpful('u1', 'r1');

    expect(res).toEqual({ helpful: false, helpfulCount: 3 });
    expect(db.reviewVote.createMany).not.toHaveBeenCalled();
  });

  it('o`z sharhiga ovoz berib bo`lmaydi', async () => {
    db.review.findUnique.mockResolvedValue({ ...APPROVED, userId: 'u1' });
    await expect(toggleHelpful('u1', 'r1')).rejects.toMatchObject({
      status: 403,
      code: 'OWN_REVIEW',
    });
  });

  it('tasdiqlanmagan sharh — 404', async () => {
    db.review.findUnique.mockResolvedValue({ ...APPROVED, isApproved: false });
    await expect(toggleHelpful('u1', 'r1')).rejects.toMatchObject({ status: 404 });
  });

  it('ro`yxatda ko`ruvchining ovozlari belgilanadi', async () => {
    db.review.findMany.mockResolvedValue([reviewRow({ id: 'r1' }), reviewRow({ id: 'r2' })]);
    db.review.count.mockResolvedValue(2);
    db.reviewVote.findMany.mockResolvedValue([{ reviewId: 'r2' }]);

    const page = await listProductReviews('p1', { viewerId: 'u1', sort: 'helpful' });

    expect(page.items.map((r) => r.votedByMe)).toEqual([false, true]);
    expect(db.review.findMany.mock.calls[0]?.[0].orderBy[0]).toEqual({ helpfulCount: 'desc' });
  });
});
