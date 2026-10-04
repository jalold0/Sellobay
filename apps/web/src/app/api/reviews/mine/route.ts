// GET /api/reviews/mine — foydalanuvchining o'z sharhlari.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { listMyReviews } from '@/lib/reviews-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  return apiOk({ items: await listMyReviews(user.id) });
}
