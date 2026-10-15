// GET /api/products/{slug}/reviews — mahsulot sharhlari (ochiq).
//
// Tizimga kirgan bo'lsa javobga `eligibility` ham qo'shiladi: mijoz
// sharh yoza oladimi. Klient tugmani SHUNGA qarab chizadi — qoidani
// o'zi takrorlamaydi.
//
// Biznes-logika `@/lib/reviews-server` da.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import {
  listProductReviews,
  REVIEW_SORTS,
  reviewEligibility,
  reviewSummary,
  type ReviewSort,
} from '@/lib/reviews-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    select: { id: true },
  });
  if (!product) return apiError(404, 'PRODUCT_NOT_FOUND', 'Mahsulot topilmadi');

  const url = new URL(req.url);
  const page = Math.max(Number(url.searchParams.get('page') ?? 1), 1);
  const limit = Number(url.searchParams.get('limit') ?? 10);
  // Filtrlar: ?rating=5, ?withPhotos=1, ?sort=newest|helpful|rating-high|rating-low
  const ratingParam = Number(url.searchParams.get('rating'));
  const rating =
    Number.isInteger(ratingParam) && ratingParam >= 1 && ratingParam <= 5 ? ratingParam : null;
  const withPhotos = url.searchParams.get('withPhotos') === '1';
  const sortParam = url.searchParams.get('sort');
  const sort: ReviewSort = REVIEW_SORTS.includes(sortParam as ReviewSort)
    ? (sortParam as ReviewSort)
    : 'newest';

  // Foydalanuvchi AVVAL: ro'yxatda qaysi sharhlarga «foydali» bosgani belgilanadi.
  const user = await getCurrentUser();
  const [list, summary] = await Promise.all([
    listProductReviews(product.id, { page, limit, rating, withPhotos, sort, viewerId: user?.id }),
    // Xulosa (yulduzlar taqsimoti, suratlilar soni) filtrga bog'liq emas
    // va faqat birinchi sahifada kerak — keyingi sahifalarda so'ralmaydi.
    page === 1 ? reviewSummary(product.id) : Promise.resolve(null),
  ]);

  return apiOk({
    ...list,
    summary,
    eligibility: user ? await reviewEligibility(user.id, product.id) : null,
  });
}
