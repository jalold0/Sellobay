// Sotuvchi paneli middleware — barcha yo'llar himoyalangan, faqat /login va /api/auth ochiq.
// Auth cookie'siz yo'l: foydalanuvchi /login ga redirect bo'ladi.

import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

import { COOKIE_ACCESS, COOKIE_REFRESH, accessSecretOrNull } from '@/lib/auth/constants';
import { canOpenPage, homeFor, isStaff } from '@/lib/permissions';

import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];
const PUBLIC_PREFIXES = ['/api/auth/', '/_next/', '/favicon', '/icon', '/apple-icon', '/manifest'];

const encoder = new TextEncoder();

// Web (mijoz) ilovasi ham AYNI shu JWT_SECRET va `sb_at` cookie nomidan foydalanadi —
// ya'ni oddiy xaridorning tokeni ham imzo tekshiruvidan o'tadi. Shuning uchun imzo yetarli
// emas: xodim roli ham tekshiriladi (API route'larda `requirePermission` bor, bu esa panel
// sahifalari uchun ikkinchi qatlam). Qaytadi: token rollari yoki null (token yaroqsiz).
async function accessRoles(token: string): Promise<string[] | null> {
  try {
    const secret = accessSecretOrNull();
    // Kalit yo'q/juda qisqa bo'lsa hech qanday token qabul qilinmaydi.
    if (!secret) return null;
    const { payload } = await jwtVerify(token, encoder.encode(secret));
    const roles = Array.isArray(payload.roles) ? (payload.roles as string[]) : [];
    return isStaff(roles) ? roles : null;
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ochiq yo'llar
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // Sir yo`qligi "kirilmagan" degani EMAS — server sozlanmagan degani.
  // Ilgari ikkalasi bir xil ishlangani uchun JWT_SECRET qo`yilmagan muhitda
  // kirgan foydalanuvchi ham har safar /login ga qaytarilaverardi va sabab
  // hech qayerda ko`rinmasdi.
  if (!accessSecretOrNull()) {
    console.error('[auth] JWT_SECRET qo`yilmagan — panelga kirib bo`lmaydi.');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'AUTH_NOT_CONFIGURED',
          message: 'Server auth sozlamasi to`liq emas (JWT_SECRET).',
        },
      },
      { status: 503 },
    );
  }

  const token = req.cookies.get(COOKIE_ACCESS)?.value;
  const roles = token ? await accessRoles(token) : null;

  if (!roles) {
    // Access 15 daqiqada tugaydi, refresh cookie 30 kun yashaydi: avval sessiyani yangilaymiz.
    // Rotatsiya Prisma talab qiladi (middleware Edge'da) — ish /api/auth/refresh ga beriladi.
    // Sahifa va GET so'rov — 302 (fetch redirect'ni o'zi kuzatadi); boshqa metodlar 401 oladi
    // va client `api()` POST /api/auth/refresh qilib bir marta takrorlaydi. Cheksiz aylanish
    // yo'q: yangilash muvaffaqiyatsiz bo'lsa route cookie'larni tozalaydi.
    const hasRefresh = Boolean(req.cookies.get(COOKIE_REFRESH)?.value);
    if (hasRefresh && (!pathname.startsWith('/api/') || req.method === 'GET')) {
      const refreshUrl = req.nextUrl.clone();
      refreshUrl.pathname = '/api/auth/refresh';
      refreshUrl.search = `?next=${encodeURIComponent(pathname + req.nextUrl.search)}`;
      return NextResponse.redirect(refreshUrl);
    }
    // API yo'llar: 401 JSON qaytarish (redirect emas, fetch'lar sahifani parse qila olmaydi)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHENTICATED', message: 'Tizimga kirilmagan' } },
        { status: 401 },
      );
    }
    // Sahifa yo'llar: /login ga redirect
    const loginUrl = new URL('/login', req.url);
    if (pathname !== '/' && pathname !== '/login') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Bo'lim ruxsati (ADR 0019): masalan ombor xodimi /payouts ni ochsa — o'z bosh sahifasiga.
  // API'lar bu yerda emas, har route'ning o'zida (`requirePermission`) tekshiriladi.
  if (!pathname.startsWith('/api/') && !canOpenPage(roles, pathname)) {
    const home = new URL(homeFor(roles), req.url);
    home.searchParams.set('denied', pathname);
    return NextResponse.redirect(home);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)).*)',
  ],
};
