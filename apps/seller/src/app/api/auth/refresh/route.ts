// Sessiyani yangilash. Access JWT 15 daqiqada tugaydi, refresh cookie 30 kun yashaydi.
//
// Ilgari panelda bu route yo'q edi (`rotateRefresh` yozilgan, lekin hech kim chaqirmasdi):
// 15 daqiqadan keyin sotuvchi amaldagi sessiyasi bilan login'ga uloqtirilardi (audit P1).
//
//   GET  ?next=/orders — middleware sahifa ochilganda shu yerga yuboradi: yangilab, qaytaradi;
//   POST               — client `api()` 401 olganda chaqiradi va so'rovni bir marta takrorlaydi.

import { safeInternalPath } from '@ecom/utils';
import { NextResponse } from 'next/server';

import { COOKIE_REFRESH } from '@/lib/auth/constants';
import { apiError, apiOk } from '@/lib/auth/errors';
import { clearCookies, rotateRefresh } from '@/lib/auth/session';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const next = safeInternalPath(req.nextUrl.searchParams.get('next'));
  const cookieRaw = req.cookies.get(COOKIE_REFRESH)?.value;

  const failed = () => {
    // API so'rovi (fetch redirect'ni kuzatgan) — HTML login sahifasi emas, JSON 401.
    if (next.startsWith('/api/')) {
      const res = apiError(401, 'UNAUTHENTICATED', "Sessiya muddati o'tgan — qayta kiring");
      clearCookies(res);
      return res;
    }
    // Yangilab bo'lmadi — login'ga. Cookie'lar tozalanadi, aks holda middleware yana shu
    // yerga yuborib cheksiz aylanish bo'lardi.
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';
    const res = NextResponse.redirect(loginUrl);
    clearCookies(res);
    return res;
  };
  if (!cookieRaw) return failed();

  const target = new URL(next, req.nextUrl.origin);
  const rotated = await rotateRefresh(NextResponse.redirect(target), cookieRaw);
  return rotated ?? failed();
}

export async function POST(req: NextRequest) {
  const cookieRaw = req.cookies.get(COOKIE_REFRESH)?.value;
  if (cookieRaw) {
    const rotated = await rotateRefresh(apiOk({ rotated: true }), cookieRaw);
    if (rotated) return rotated;
  }
  const res = apiError(401, 'INVALID_REFRESH', "Sessiya muddati o'tgan — qayta kiring");
  clearCookies(res);
  return res;
}
