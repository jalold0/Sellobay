import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { COOKIE_ACCESS } from '@/lib/auth/constants';

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
    await jwtVerify(token, encoder.encode(process.env.JWT_SECRET ?? ''));
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
      const locale = detectLocale(pathname);
      const loginUrl = req.nextUrl.clone();
      loginUrl.pathname = `/${locale}/login`;
      loginUrl.searchParams.set('next', pathname + req.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
