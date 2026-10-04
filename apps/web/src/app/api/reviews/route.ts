// POST /api/reviews — sharh yozish.
//
// Faqat mahsulotni YETKAZIB OLGAN mijoz yoza oladi va bitta mahsulotga
// bitta sharh. Tekshiruv `@/lib/reviews-server` da.

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { createReview, ReviewError } from '@/lib/reviews-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  productId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional().nullable(),
  body: z.string().trim().max(2000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  try {
    const review = await createReview({ userId: user.id, ...parsed.data });
    return apiOk({ review }, { status: 201 });
  } catch (e) {
    if (e instanceof ReviewError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
