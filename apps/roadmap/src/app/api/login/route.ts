import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';

import { COOKIE, sessionKey } from '../../../lib/session';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const expected = process.env.ROADMAP_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "ROADMAP_PASSWORD o'rnatilmagan — administratorga murojaat qiling" },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const password = String(form.get('password') ?? '');

  if (password !== expected) {
    const url = new URL('/login', req.url);
    url.searchParams.set('error', '1');
    return NextResponse.redirect(url, { status: 303 });
  }

  const token = await new SignJWT({ ok: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(await sessionKey(expected));

  const next = String(form.get('next') ?? '/') || '/';
  const res = NextResponse.redirect(new URL(next, req.url), { status: 303 });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
