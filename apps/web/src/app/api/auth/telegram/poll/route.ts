// POST /api/auth/telegram/poll { token } — botda raqam ulashildimi? (ADR 0018)
//   202 — hali kutilmoqda; 200 — kirildi (cookie o'rnatiladi); 410 — eskirgan/ishlatilgan.

import { apiError, apiOk } from '@/lib/auth/errors';
import { loginWithVerifiedPhone } from '@/lib/auth/phone-login';
import { createSession, requestMeta, setCookies } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';
import { hashLoginToken, isLoginToken } from '@/lib/telegram/login';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Brauzer har 2 soniyada so'raydi — daqiqasiga 60 dan ortig'i shubhali.
  const limited = await enforceRateLimit(req, 'telegram-poll', { limit: 60, windowSec: 60 });
  if (limited) return limited;

  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  if (!isLoginToken(body?.token)) return apiError(400, 'VALIDATION', "Noto'g'ri so'rov");

  const now = new Date();
  const login = await prisma.telegramLogin.findUnique({
    where: { tokenHash: hashLoginToken(body.token) },
  });
  if (!login || login.consumedAt || (!login.verifiedAt && login.expiresAt <= now)) {
    return apiError(410, 'TELEGRAM_EXPIRED', "So'rov muddati tugadi");
  }
  if (!login.verifiedAt || !login.phone || !login.telegramId) {
    return apiOk({ status: 'pending' as const }, { status: 202 });
  }

  // Bir marta: ikki parallel so'rovdan faqat bittasi sessiya oladi.
  const consumed = await prisma.telegramLogin.updateMany({
    where: { id: login.id, consumedAt: null },
    data: { consumedAt: now },
  });
  if (consumed.count === 0) {
    return apiError(410, 'TELEGRAM_EXPIRED', "So'rov allaqachon ishlatilgan");
  }

  const result = await loginWithVerifiedPhone({
    phone: login.phone,
    firstName: login.firstName ?? undefined,
    ip: clientIp(req),
    via: 'telegram-login',
    telegram: { id: login.telegramId },
  });
  if (!result.ok) {
    if (result.reason === 'blocked') return apiError(403, 'ACCOUNT_BLOCKED', 'Hisob bloklangan');
    if (result.reason === 'pending') {
      return apiError(403, 'ACCOUNT_PENDING', 'Hisob hali tasdiqlanmagan');
    }
    return apiError(409, 'TELEGRAM_RETRY', "Qayta urinib ko'ring");
  }

  const { user } = result;
  const tokens = await createSession(user.id, requestMeta());
  const res = apiOk({
    status: 'ok' as const,
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
