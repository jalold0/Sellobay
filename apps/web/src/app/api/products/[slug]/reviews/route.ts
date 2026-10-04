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
import { listProductReviews, reviewEligibility } from '@/lib/reviews-server';

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

  const [list, user] = await Promise.all([
    listProductReviews(product.id, { page, limit }),
    getCurrentUser(),
  ]);

  return apiOk({
    ...list,
    eligibility: user ? await reviewEligibility(user.id, product.id) : null,
  });
}
