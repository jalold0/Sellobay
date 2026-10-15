// POST /api/reviews/{id}/helpful — «Foydali» ovozini qo'yish yoki qaytarib olish.
//
// Javob: { helpful, helpfulCount } — klient tugma holatini va sonni
// shundan oladi, o'zi hisoblamaydi. Qoida `@/lib/reviews-server` da.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { enforceRateLimit } from '@/lib/rate-limit';
import { ReviewError, toggleHelpful } from '@/lib/reviews-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Ovoz berish uchun tizimga kiring');

  if (!/^[a-f0-9-]{36}$/i.test(params.id)) {
    return apiError(404, 'NOT_FOUND', 'Sharh topilmadi');
  }

  // Tugmani tez-tez bosish (yoki skript) jadvalni to'ldirmasin.
  const limited = await enforceRateLimit(req, 'review-helpful', { limit: 60, windowSec: 600 });
  if (limited) return limited;

  try {
    return apiOk(await toggleHelpful(user.id, params.id));
  } catch (e) {
    if (e instanceof ReviewError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
