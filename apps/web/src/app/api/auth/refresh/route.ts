import { NextRequest } from 'next/server';
import { COOKIE_REFRESH } from '@/lib/auth/constants';
import { apiError, apiOk } from '@/lib/auth/errors';
import { clearCookies, rotateRefresh } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const raw = req.cookies.get(COOKIE_REFRESH)?.value;
  if (!raw) return apiError(401, 'NO_REFRESH', "Sessiya muddati o'tgan");

  const res = apiOk({ rotated: true });
  const rotated = await rotateRefresh(res, raw);
  if (!rotated) {
    // Yaroqsiz/yo'qotilgan refresh — cookie'larni tozalaymiz
    const err = apiError(401, 'INVALID_REFRESH', "Sessiya muddati o'tgan");
    clearCookies(err);
    return err;
  }
  return rotated;
}
