// Sotuvchi paneli middleware — barcha yo'llar himoyalangan, faqat /login va /api/auth ochiq.
// Auth cookie'siz yo'l: foydalanuvchi /login ga redirect bo'ladi.

import { jwtVerify } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

import { COOKIE_ACCESS } from '@/lib/auth/constants';

const PUBLIC_PATHS = ['/login'];
const PUBLIC_PREFIXES = ['/api/auth/', '/_next/', '/favicon', '/icon', '/apple-icon', '/manifest'];

const encoder = new TextEncoder();

// Ruxsat etilgan rollar. Web (mijoz) ilovasi ham AYNI shu JWT_SECRET va
// `sb_at` cookie nomidan foydalanadi — ya'ni oddiy xaridorning tokeni ham
// imzo tekshiruvidan o'tadi. Shuning uchun imzo yetarli emas: rol ham
// tekshirilishi kerak (API route'larda rol tekshiruvi bor, bu esa panel
// sahifalari uchun ikkinchi qatlam).
const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN'];

async function isValidAccess(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(process.env.JWT_SECRET ?? ''));
    const roles = Array.isArray(payload.roles) ? (payload.roles as string[]) : [];
    return roles.some((r) => ALLOWED_ROLES.includes(r));
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ochiq yo'llar
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get(COOKIE_ACCESS)?.value;
  const validAccess = token ? await isValidAccess(token) : false;

  if (!validAccess) {
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)).*)',
  ],
};
