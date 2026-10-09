// Mahsulot sharhlari — biznes-servis (application qatlami).
// HTTP'ga bog'liq emas; route faqat auth/parse qilib shu yerga keladi.
//
// NEGA BU FAYL PAYDO BO'LDI:
// `Review` jadvali sxemada bor edi, lekin butun kod bazasida
// `prisma.review` UMUMAN uchramasdi — na API, na o'qish, na yozish.
// Mahsulotdagi `rating` va `reviewCount` esa seed'ga qo'lda yozilgan
// raqamlar edi (`rating: 4.8, reviewCount: 124`), ya'ni yulduzchalar
// ortida birorta ham sharh yo'q edi.
//
// QOIDALAR (mahsulot egasining qarori):
//   • sharh yozishga FAQAT shu mahsulotni yetkazib olgan mijoz haqli;
//   • sharh darhol ko'rinadi (`isApproved: true`) — tasdiqlaydigan
//     admin ekrani yo'q, `false` qoldirsak sharhlar hech qachon
//     ko'rinmasdi;
//   • bitta mijoz bitta mahsulotga BITTA sharh yozadi.

import { ApiDomainError } from '@ecom/api-contract';
import { Prisma } from '@ecom/database';

import { prisma } from '@/lib/db';

/**
 * `ApiDomainError` dan meros: `withApi()` uni BOSHQA domen xatolari
 * bilan birga, bitta joyda ushlaydi. Ilgari har route o'zining
 * `catch (e) { if (e instanceof ReviewError) ... }` blokini yozardi va
 * blok unutilsa, tushunarli xato kutilmagan 500 ga aylanardi.
 */
export class ReviewError extends ApiDomainError {}

/** Sharh yozish huquqini beradigan buyurtma holatlari. */
const PURCHASED_STATUSES = ['DELIVERED'] as const;

export const REVIEW_PAGE_SIZE = 10;

const reviewSelect = {
  id: true,
  rating: true,
  title: true,
  body: true,
  images: true,
  isVerifiedPurchase: true,
  helpfulCount: true,
  createdAt: true,
  userId: true,
  user: { select: { firstName: true, lastName: true } },
} satisfies Prisma.ReviewSelect;

type ReviewRow = Prisma.ReviewGetPayload<{ select: typeof reviewSelect }>;

/**
 * Javobga o'giradi.
 *
 * Mualliflikni ko'rsatishda FAQAT ism va familiyaning bosh harfi
 * beriladi: to'liq familiya, email va telefon ochiq sharhda kerak
 * emas va uni qaytarib olib bo'lmaydi.
 */
export function serializeReview(r: ReviewRow) {
  const first = r.user.firstName?.trim() ?? '';
  const lastInitial = r.user.lastName?.trim()?.[0];
  const author = [first, lastInitial ? `${lastInitial}.` : null].filter(Boolean).join(' ');

  return {
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    images: r.images,
    isVerifiedPurchase: r.isVerifiedPurchase,
    helpfulCount: r.helpfulCount,
    createdAt: r.createdAt.toISOString(),
    /** Bo'sh bo'lsa klient «Foydalanuvchi» deb ko'rsatadi. */
    author,
    /** Shu sharh SO'RAGAN foydalanuvchiniki ekanini bildiradi. */
    userId: r.userId,
  };
}

/** Mahsulotning ko'rinadigan sharhlari. */
export async function listProductReviews(
  productId: string,
  { page = 1, limit = REVIEW_PAGE_SIZE }: { page?: number; limit?: number } = {},
) {
  const take = Math.min(Math.max(limit, 1), 50);
  const skip = (Math.max(page, 1) - 1) * take;

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where: { productId, isApproved: true },
      orderBy: { createdAt: 'desc' },
      select: reviewSelect,
      skip,
      take,
    }),
    prisma.review.count({ where: { productId, isApproved: true } }),
  ]);

  return {
    items: items.map(serializeReview),
    total,
    page: Math.max(page, 1),
    limit: take,
    hasMore: skip + items.length < total,
  };
}

/**
 * Foydalanuvchi shu mahsulotni YETKAZIB OLGAN buyurtmasi.
 *
 * `null` — sotib olmagan yoki hali yetkazilmagan. Sharh buyurtmaga
 * bog'lanadi, shunda keyin qaysi xariddan kelgani ko'rinadi.
 */
export async function findPurchaseOrderId(
  userId: string,
  productId: string,
): Promise<string | null> {
  const item = await prisma.orderItem.findFirst({
    where: {
      productId,
      order: { userId, status: { in: [...PURCHASED_STATUSES] } },
    },
    orderBy: { order: { placedAt: 'desc' } },
    select: { orderId: true },
  });
  return item?.orderId ?? null;
}

/** Mijoz shu mahsulotga sharh yoza oladimi. */
export async function reviewEligibility(userId: string, productId: string) {
  const [orderId, existing] = await Promise.all([
    findPurchaseOrderId(userId, productId),
    prisma.review.findFirst({ where: { userId, productId }, select: { id: true } }),
  ]);

  return {
    canReview: orderId !== null && existing === null,
    hasPurchased: orderId !== null,
    /** Allaqachon yozgan sharh — klient uni tahrirlash o'rniga ko'rsatadi. */
    existingReviewId: existing?.id ?? null,
  };
}

/**
 * Mahsulotning o'rtacha bahosi va sonini QAYTA hisoblaydi.
 *
 * Seed'dagi to'qima raqam shu yerda haqiqiysiga almashadi. Hisob
 * sharh yozilgan/o'chirilgan tranzaksiyaning ICHIDA bajariladi —
 * aks holda ikki sharh bir vaqtda kelganda son adashardi.
 */
async function recomputeProductRating(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<void> {
  const agg = await tx.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await tx.product.update({
    where: { id: productId },
    data: {
      // `Decimal(3,2)` — 0.00..9.99 oralig'i, ya'ni ikki kasr yetarli.
      rating: new Prisma.Decimal((agg._avg.rating ?? 0).toFixed(2)),
      reviewCount: agg._count._all,
    },
  });
}

export interface CreateReviewInput {
  userId: string;
  productId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
}

/** Sharh yozadi va mahsulot bahosini yangilaydi. */
export async function createReview(input: CreateReviewInput) {
  const product = await prisma.product.findUnique({
    where: { id: input.productId },
    select: { id: true, status: true },
  });
  if (!product || product.status !== 'ACTIVE') {
    throw new ReviewError(404, 'PRODUCT_NOT_FOUND', 'Mahsulot topilmadi');
  }

  const orderId = await findPurchaseOrderId(input.userId, input.productId);
  if (orderId === null) {
    throw new ReviewError(
      403,
      'NOT_PURCHASED',
      'Sharh yozish uchun mahsulotni sotib olgan va qabul qilgan bo`lishingiz kerak',
    );
  }

  const existing = await prisma.review.findFirst({
    where: { userId: input.userId, productId: input.productId },
    select: { id: true },
  });
  if (existing) {
    throw new ReviewError(409, 'ALREADY_REVIEWED', 'Siz bu mahsulotga allaqachon sharh yozgansiz');
  }

  return prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        productId: input.productId,
        userId: input.userId,
        orderId,
        rating: input.rating,
        title: input.title?.trim() || null,
        body: input.body?.trim() || null,
        isVerifiedPurchase: true,
        // Tasdiqlaydigan admin ekrani yo'q — `false` qoldirsak sharh
        // hech qachon ko'rinmasdi. Yozish huquqi allaqachon xaridga
        // bog'langani uchun spam xavfi past.
        isApproved: true,
      },
      select: reviewSelect,
    });

    await recomputeProductRating(tx, input.productId);
    return serializeReview(created);
  });
}

/** O'z sharhini o'chiradi. */
export async function deleteReview(userId: string, reviewId: string): Promise<void> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, productId: true },
  });
  if (!review) throw new ReviewError(404, 'NOT_FOUND', 'Sharh topilmadi');
  if (review.userId !== userId) {
    throw new ReviewError(403, 'FORBIDDEN', 'Bu sharh sizniki emas');
  }

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: reviewId } });
    await recomputeProductRating(tx, review.productId);
  });
}

/** Foydalanuvchining o'z sharhlari. */
export async function listMyReviews(userId: string) {
  const items = await prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      ...reviewSelect,
      product: { select: { slug: true, name: true } },
    },
  });

  return items.map((r) => ({
    ...serializeReview(r),
    product: { slug: r.product.slug, name: r.product.name },
  }));
}
