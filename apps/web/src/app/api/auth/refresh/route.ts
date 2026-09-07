import { NextResponse } from 'next/server';

import { COOKIE_REFRESH } from '@/lib/auth/constants';
import { apiError, apiOk } from '@/lib/auth/errors';
import { clearCookies, rotateRefresh, rotateRefreshTokens } from '@/lib/auth/session';
import { safeInternalPath } from '@/lib/safe-redirect';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/refresh?next=/uz/profile — SESSIYANI YANGILAB, kelgan yo'lga qaytaradi.
 *
 * Middleware uchun kerak: access JWT 15 daqiqada tugaydi, refresh cookie esa
 * 30 kun yashaydi. Ilgari web'da /api/auth/refresh ni HECH KIM chaqirmasdi —
 * 15 daqiqadan keyin foydalanuvchi amaldagi 30 kunlik sessiyasi bilan
 * login'ga uloqtirilardi. (Mobil ilova buni allaqachon qilardi.)
 *
 * Middleware Edge'da ishlaydi va Prisma'ni chaqira olmaydi, shu sababli
 * rotatsiya shu nodejs route'da bajariladi va foydalanuvchi 302 bilan
 * o'z yo'liga qaytariladi.
 */
export async function GET(req: NextRequest) {
  const next = safeInternalPath(req.nextUrl.searchParams.get('next'));
  const cookieRaw = req.cookies.get(COOKIE_REFRESH)?.value;

  const failed = () => {
    // Yangilash imkonsiz — login'ga. Cookie'lar tozalanadi, aks holda
    // middleware yana shu yerga yuborib cheksiz aylanish bo'lardi.
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/uz/login';
    loginUrl.search = `?next=${encodeURIComponent(next)}`;
    const res = NextResponse.redirect(loginUrl);
    clearCookies(res);
    return res;
  };

  if (!cookieRaw) return failed();

  const target = req.nextUrl.clone();
  target.pathname = next.split('?')[0] ?? '/';
  target.search = next.includes('?') ? `?${next.split('?').slice(1).join('?')}` : '';

  const res = NextResponse.redirect(target);
  const rotated = await rotateRefresh(res, cookieRaw);
  if (!rotated) return failed();
  return rotated;
}

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
