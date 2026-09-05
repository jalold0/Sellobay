import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { COOKIE_ACCESS, COOKIE_REFRESH, accessSecretOrNull } from '@/lib/auth/constants';

const LOCALES = ['uz', 'ru', 'en'] as const;
type Locale = (typeof LOCALES)[number];

// Auth talab qiladigan yo'llar (locale prefix tashlangandan keyin)
// /checkout — guest checkout uchun OCHIQ (login majburiy emas, faqat telefon yetadi).
// Orders API guest buyurtmani qo'llab-quvvatlaydi (userId null, guestPhone bilan).
const PROTECTED_PREFIXES = ['/profile', '/orders'];
// Lekin /orders/success ochiq qoladi (buyurtmadan keyingi sahifa)
const PROTECTED_EXCLUDES = ['/orders/success'];

const intlMiddleware = createIntlMiddleware({
  locales: LOCALES as unknown as string[],
  defaultLocale: 'uz',
  localePrefix: 'always',
});

function detectLocale(pathname: string): Locale {
  for (const loc of LOCALES) {
    if (pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`) return loc;
  }
  return 'uz';
}

function stripLocale(pathname: string): string {
  for (const loc of LOCALES) {
    if (pathname === `/${loc}`) return '/';
    if (pathname.startsWith(`/${loc}/`)) return pathname.substring(loc.length + 1);
  }
  return pathname;
}

function isProtected(path: string): boolean {
  if (PROTECTED_EXCLUDES.some((p) => path === p || path.startsWith(`${p}/`))) return false;
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

const encoder = new TextEncoder();

async function isValidAccess(token: string): Promise<boolean> {
  try {
    const secret = accessSecretOrNull();
    // Kalit yo'q/juda qisqa bo'lsa hech qanday token qabul qilinmaydi.
    if (!secret) return false;
    await jwtVerify(token, encoder.encode(secret));
    return true;
  } catch {
    return false;
  }
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const localeFreePath = stripLocale(pathname);

  if (isProtected(localeFreePath)) {
    const token = req.cookies.get(COOKIE_ACCESS)?.value;
    const ok = token ? await isValidAccess(token) : false;
    if (!ok) {
      // Access JWT 15 daqiqada tugaydi, refresh cookie esa 30 kun yashaydi.
      // Refresh bo'lsa — avval sessiyani yangilashga urinamiz, keyin ham
      // bo'lmasa login'ga. Ilgari bu qadam yo'q edi: foydalanuvchi amaldagi
      // 30 kunlik sessiyasi bilan 15 daqiqadan keyin login'ga uloqtirilardi.
      //
      // Rotatsiya Prisma talab qiladi, middleware esa Edge'da ishlaydi —
      // shuning uchun ish /api/auth/refresh (nodejs) ga topshiriladi va u
      // 302 bilan shu yo'lga qaytaradi. Cheksiz aylanish bo'lmaydi: refresh
      // muvaffaqiyatsiz bo'lsa o'sha route cookie'larni tozalab login'ga
      // yuboradi, ya'ni ikkinchi kelishda `hasRefresh` false bo'ladi.
      const hasRefresh = Boolean(req.cookies.get(COOKIE_REFRESH)?.value);
      const target = pathname + req.nextUrl.search;

      if (hasRefresh) {
        const refreshUrl = req.nextUrl.clone();
        refreshUrl.pathname = '/api/auth/refresh';
        refreshUrl.search = `?next=${encodeURIComponent(target)}`;
        return NextResponse.redirect(refreshUrl);
      }

      const locale = detectLocale(pathname);
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/${locale}/login`;
      loginUrl.search = '';
      loginUrl.searchParams.set('next', target);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
