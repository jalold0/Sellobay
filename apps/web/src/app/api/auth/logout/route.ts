import { NextRequest } from 'next/server';
import { COOKIE_REFRESH } from '@/lib/auth/constants';
import { apiOk } from '@/lib/auth/errors';
import { clearCookies, revokeRefresh } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const raw = req.cookies.get(COOKIE_REFRESH)?.value;
  if (raw) await revokeRefresh(raw);

  const res = apiOk({ loggedOut: true });
  clearCookies(res);
  return res;
}
