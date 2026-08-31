import { jwtVerify } from 'jose';
import { NextResponse, type NextRequest } from 'next/server';

import { COOKIE, sessionKey } from './lib/session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/login') || pathname.startsWith('/api/login')) {
    return NextResponse.next();
  }

  // Parol qo'yilmagan bo'lsa ilova OCHIQ QOLMAYDI — hech kim kiritilmaydi.
  const password = process.env.ROADMAP_PASSWORD;
  const token = req.cookies.get(COOKIE)?.value;

  if (password && token) {
    try {
      await jwtVerify(token, await sessionKey(password));
      return NextResponse.next();
    } catch {
      // yaroqsiz yoki muddati o'tgan
    }
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('next', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
