// DELETE /api/reviews/{id} — o'z sharhini o'chirish.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { deleteReview, ReviewError } from '@/lib/reviews-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  try {
    await deleteReview(user.id, params.id);
    return apiOk({ deleted: true });
  } catch (e) {
    if (e instanceof ReviewError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
