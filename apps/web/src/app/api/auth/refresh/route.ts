import { COOKIE_REFRESH } from '@/lib/auth/constants';
import { apiError, apiOk } from '@/lib/auth/errors';
import { clearCookies, rotateRefresh, rotateRefreshTokens } from '@/lib/auth/session';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Web — refresh token cookie'da
  const cookieRaw = req.cookies.get(COOKIE_REFRESH)?.value;
  if (cookieRaw) {
    const res = apiOk({ rotated: true });
    const rotated = await rotateRefresh(res, cookieRaw);
    if (!rotated) {
      const err = apiError(401, 'INVALID_REFRESH', "Sessiya muddati o'tgan");
      clearCookies(err);
      return err;
    }
    return rotated;
  }

  // Mobile — refresh token body'da, yangi tokenlar body'da qaytadi
  const body = (await req.json().catch(() => null)) as { refresh?: string } | null;
  const bodyRaw = body?.refresh;
  if (!bodyRaw) return apiError(401, 'NO_REFRESH', "Sessiya muddati o'tgan");

  const tokens = await rotateRefreshTokens(bodyRaw);
  if (!tokens) return apiError(401, 'INVALID_REFRESH', "Sessiya muddati o'tgan");
  return apiOk({ tokens });
}
