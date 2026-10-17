// POST /api/auth/telegram/link { token, password } — raqami tasdiqlanmagan eski hisobga
// parol bilan qaytish (ADR 0018). Telegram raqamni tasdiqlagan, parol esa hisob egasi
// ekanini: ikkalasi bo'lsa raqam shu hisobda tasdiqlanadi va Telegram bog'lanadi.
// Urinishlar: har so'rovga 5 ta (keyin faqat yangi hisob yoki qaytadan boshlash).

import { apiError, apiOk } from '@/lib/auth/errors';
import { linkVerifiedPhoneWithPassword } from '@/lib/auth/phone-login';
import { createSession, requestMeta, setCookies } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { hashLoginToken, isLoginToken } from '@/lib/telegram/login';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TELEGRAM_LINK_MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, 'telegram-link', { limit: 10, windowSec: 60 });
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as {
    token?: unknown;
    password?: unknown;
  } | null;
  if (!isLoginToken(body?.token) || typeof body.password !== 'string' || !body.password) {
    return apiError(400, 'VALIDATION', "Noto'g'ri so'rov");
  }

  const now = new Date();
  const login = await prisma.telegramLogin.findUnique({
    where: { tokenHash: hashLoginToken(body.token) },
  });
  if (
    !login ||
    login.consumedAt ||
    login.expiresAt <= now ||
    !login.verifiedAt ||
    !login.phone ||
    !login.telegramId
  ) {
    return apiError(410, 'TELEGRAM_EXPIRED', "So'rov muddati tugadi");
  }

  // Urinish parolni tekshirishdan OLDIN atomar band qilinadi (parallel taxminlar cheklovni
  // aylanib o'tmasin — audit SEC-05 dagi kabi).
  const reserved = await prisma.telegramLogin.updateMany({
    where: {
      id: login.id,
      consumedAt: null,
      linkAttempts: { lt: TELEGRAM_LINK_MAX_ATTEMPTS },
    },
    data: { linkAttempts: { increment: 1 } },
  });
  if (reserved.count === 0) {
    return apiError(
      429,
      'LINK_TOO_MANY',
      "Ko'p urinish. Yangi hisob oching yoki qaytadan boshlang.",
    );
  }

  const result = await linkVerifiedPhoneWithPassword({
    phone: login.phone,
    password: body.password,
    ip: clientIp(req),
    telegram: { id: login.telegramId },
  });
  if (!result.ok) {
    if (result.reason === 'wrong-password') {
      const left = TELEGRAM_LINK_MAX_ATTEMPTS - (login.linkAttempts + 1);
      const res = apiError(401, 'WRONG_PASSWORD', "Parol noto'g'ri");
      res.headers.set('X-Attempts-Left', String(Math.max(0, left)));
      return res;
    }
    return apiError(409, 'TELEGRAM_RETRY', "Qayta urinib ko'ring");
  }

  const consumed = await prisma.telegramLogin.updateMany({
    where: { id: login.id, consumedAt: null },
    data: { consumedAt: now },
  });
  if (consumed.count === 0) {
    return apiError(410, 'TELEGRAM_EXPIRED', "So'rov allaqachon ishlatilgan");
  }

  const { user } = result;
  const tokens = await createSession(user.id, requestMeta());
  const res = apiOk({
    status: 'ok' as const,
    isNew: false,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    tokens,
  });
  setCookies(res, tokens.access, tokens.refresh);
  return res;
}
