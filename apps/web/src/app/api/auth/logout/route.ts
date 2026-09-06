import { COOKIE_REFRESH } from '@/lib/auth/constants';
import { apiOk } from '@/lib/auth/errors';
import { clearCookies, revokeRefresh } from '@/lib/auth/session';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/logout — refresh tokenni bazada bekor qiladi.
 *
 * Ilgari token FAQAT cookie'dan o'qilardi. Mobil ilova esa cookie ishlatmaydi —
 * tokenlar secureStore'da va so'rovlar `Authorization: Bearer` bilan ketadi.
 * Ya'ni mobil chiqishda refresh token bazada 30 kun yaroqli qolardi: telefon
 * boshqa qo'lga o'tsa yoki zaxiradan olinsa, undan yangi access token olish
 * mumkin edi.
 *
 * Endi ikki manba ham qabul qilinadi — `/api/auth/refresh` POST bilan bir xil
 * naqsh (web cookie'dan, mobil body'dan).
 *
 * Bu endpoint auth talab qilmaydi va bu ataylab: bekor qilish tokenning O'ZIGA
 * egalik bilan isbotlanadi (`revokeRefresh` xom tokenni hash qilib solishtiradi).
 * Boshqa odamning tokenini bekor qilish uchun uning maxfiy tokenini bilish
 * kerak bo'ladi, ya'ni yangi hujum yuzasi ochilmaydi.
 */
export async function POST(req: NextRequest) {
  const cookieRaw = req.cookies.get(COOKIE_REFRESH)?.value;

  const body = (await req.json().catch(() => null)) as { refresh?: unknown } | null;
  const bodyRaw = typeof body?.refresh === 'string' ? body.refresh : undefined;

  // Ikkalasi ham kelsa ikkalasi ham bekor qilinadi — chiqish yarim qolmasin.
  for (const raw of [cookieRaw, bodyRaw]) {
    if (raw) await revokeRefresh(raw);
  }

  const res = apiOk({ loggedOut: true });
  clearCookies(res);
  return res;
}
