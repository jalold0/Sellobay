// GET /api/global/sourcing/queue — operator navbati (ADMIN / SUPER_ADMIN)
// Rolni sourcing-server o'zi tekshiradi (assertOperator) — route faqat parse qiladi.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { listSourcingQueue, SourcingError } from '@/lib/sourcing-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  const status = req.nextUrl.searchParams.get('status') ?? undefined;
  const takeRaw = req.nextUrl.searchParams.get('take');
  const take = takeRaw ? Number(takeRaw) : undefined;

  try {
    return apiOk(
      await listSourcingQueue(user, {
        status,
        take: Number.isFinite(take) ? take : undefined,
      }),
    );
  } catch (e) {
    if (e instanceof SourcingError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
