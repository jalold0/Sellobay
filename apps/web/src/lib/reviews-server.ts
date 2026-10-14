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

export const REVIEW_SORTS = ['newest', 'helpful', 'rating-high', 'rating-low'] as const;
export type ReviewSort = (typeof REVIEW_SORTS)[number];

export interface ReviewListOptions {
  page?: number;
  limit?: number;
  /** Faqat shu yulduzli sharhlar (1..5). */
  rating?: number | null;
  /** Faqat surati bor sharhlar. */
  withPhotos?: boolean;
  sort?: ReviewSort;
  /** Tizimga kirgan mijoz — qaysi sharhlarga «foydali» bosganini bilish uchun. */
  viewerId?: string | null;
}

/**
 * Mahsulot sharhlari xulosasi: o'rtacha, jami, har yulduz soni va
 * surati borlar. BUTUN sharhlardan hisoblanadi — ilgari web sahifadagi
 * taqsimot faqat yuklangan 20 ta sharhdan chiqarilardi.
 */
export async function reviewSummary(productId: string) {
  const where = { productId, isApproved: true };
  const [groups, withPhotos] = await Promise.all([
    prisma.review.groupBy({ by: ['rating'], where, _count: { _all: true } }),
    prisma.review.count({ where: { ...where, images: { isEmpty: false } } }),
  ]);
  const breakdown: Record<'1' | '2' | '3' | '4' | '5', number> = {
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  };
  let total = 0;
  let sum = 0;
  for (const g of groups) {
    const key = String(g.rating) as keyof typeof breakdown;
    if (!(key in breakdown)) continue;
    breakdown[key] = g._count._all;
    total += g._count._all;
    sum += g.rating * g._count._all;
  }
  return {
    total,
    average: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
    breakdown,
    withPhotos,
  };
}

/** Mahsulotning ko'rinadigan sharhlari (filtr va saralash bilan). */
export async function listProductReviews(productId: string, opts: ReviewListOptions = {}) {
  const {
    page = 1,
    limit = REVIEW_PAGE_SIZE,
    rating,
    withPhotos = false,
    sort = 'newest',
    viewerId = null,
  } = opts;
  const take = Math.min(Math.max(limit, 1), 50);
  const skip = (Math.max(page, 1) - 1) * take;

  const where: Prisma.ReviewWhereInput = {
    productId,
    isApproved: true,
    ...(rating && rating >= 1 && rating <= 5 ? { rating } : {}),
    ...(withPhotos ? { images: { isEmpty: false } } : {}),
  };
  const orderBy: Prisma.ReviewOrderByWithRelationInput[] =
    sort === 'helpful'
      ? [{ helpfulCount: 'desc' }, { createdAt: 'desc' }]
      : sort === 'rating-high'
        ? [{ rating: 'desc' }, { createdAt: 'desc' }]
        : sort === 'rating-low'
          ? [{ rating: 'asc' }, { createdAt: 'desc' }]
          : [{ createdAt: 'desc' }];

  const [items, total] = await Promise.all([
    prisma.review.findMany({ where, orderBy, select: reviewSelect, skip, take }),
    prisma.review.count({ where }),
  ]);

  // Ko'ruvchi ovoz bergan sharhlar — bitta so'rov, sahifadagilar uchun.
  const voted =
    viewerId && items.length > 0
      ? new Set(
          (
            await prisma.reviewVote.findMany({
              where: { userId: viewerId, reviewId: { in: items.map((r) => r.id) } },
              select: { reviewId: true },
            })
          ).map((v) => v.reviewId),
        )
      : null;

  return {
    items: items.map((r) => ({ ...serializeReview(r), votedByMe: voted?.has(r.id) ?? false })),
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

  const product = await tx.product.update({
    where: { id: productId },
    data: {
      // `Decimal(3,2)` — 0.00..9.99 oralig'i, ya'ni ikki kasr yetarli.
      rating: new Prisma.Decimal((agg._avg.rating ?? 0).toFixed(2)),
      reviewCount: agg._count._all,
    },
    select: { sellerId: true },
  });

  if (product.sellerId) await recomputeSellerRating(tx, product.sellerId);
}

/**
 * Do'kon reytingi — uning BARCHA mahsulotlaridagi tasdiqlangan sharhlar
 * o'rtachasi (har sharh bir ovoz: 100 sharhli mahsulot 1 sharhlidan og'ir).
 *
 * `Seller.rating` ilgari hech qachon yozilmasdi va 0 turardi. U «boshqa
 * do'konlardagi o'xshash tovarlar» saralashida ishlatiladi.
 */
export async function recomputeSellerRating(
  tx: Prisma.TransactionClient,
  sellerId: string,
): Promise<number> {
  const agg = await tx.review.aggregate({
    where: { isApproved: true, product: { sellerId } },
    _avg: { rating: true },
  });
  const rating = new Prisma.Decimal((agg._avg.rating ?? 0).toFixed(2));
  await tx.seller.update({ where: { id: sellerId }, data: { rating } });
  return rating.toNumber();
}

export interface CreateReviewInput {
  userId: string;
  productId: string;
  rating: number;
  title?: string | null;
  body?: string | null;
  /** `reviews/` papkasidagi ochiq surat manzillari (route tekshiradi). */
  images?: string[];
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
        images: [...new Set(input.images ?? [])],
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

/**
 * «Foydali» ovozini almashtiradi: bosilmagan bo'lsa qo'yadi, bosilgan
 * bo'lsa qaytarib oladi. Bir mijoz bir sharhga bitta ovoz — jadvalning
 * birlamchi kaliti (reviewId, userId) buni bazada kafolatlaydi.
 *
 * O'z sharhiga ovoz berib bo'lmaydi: aks holda muallif o'z sharhini
 * «eng foydali» qatoriga chiqarardi.
 */
export async function toggleHelpful(
  userId: string,
  reviewId: string,
): Promise<{ helpful: boolean; helpfulCount: number }> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, userId: true, isApproved: true },
  });
  if (!review || !review.isApproved) throw new ReviewError(404, 'NOT_FOUND', 'Sharh topilmadi');
  if (review.userId === userId) {
    throw new ReviewError(403, 'OWN_REVIEW', 'O`z sharhingizga ovoz bera olmaysiz');
  }

  return prisma.$transaction(async (tx) => {
    const removed = await tx.reviewVote.deleteMany({ where: { reviewId, userId } });
    if (removed.count === 0) {
      // Parallel ikki bosish: ikkinchisi kalit to'qnashuvida jim o'tadi.
      await tx.reviewVote.createMany({ data: [{ reviewId, userId }], skipDuplicates: true });
    }
    // Hisoblagich jadvaldan qayta sanaladi — +1/-1 emas: poyga bo'lsa ham
    // son haqiqatdan uzoqlashmaydi.
    const helpfulCount = await tx.reviewVote.count({ where: { reviewId } });
    await tx.review.update({ where: { id: reviewId }, data: { helpfulCount } });
    return { helpful: removed.count === 0, helpfulCount };
  });
}
