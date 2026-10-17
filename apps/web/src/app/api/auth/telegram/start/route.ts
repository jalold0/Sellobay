// POST /api/auth/telegram/start — Telegram orqali kirish so'rovini ochadi (ADR 0018).
// Javob: token (faqat shu brauzerda qoladi, /poll uchun), sayt va botda bir xil
// ko'rinadigan kod, bot havolasi.

import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';
import { siteUrl } from '@/lib/site-url';
import { ensureWebhook, telegramConfig } from '@/lib/telegram/bot-api';
import {
  hashLoginToken,
  newLoginCode,
  newLoginToken,
  TELEGRAM_LOGIN_TTL_SEC,
} from '@/lib/telegram/login';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const cfg = telegramConfig();
  if (!cfg) {
    return apiError(
      503,
      'TELEGRAM_UNAVAILABLE',
      'Telegram orqali kirish hozircha ishlamaydi — email bilan kiring',
    );
  }

  const limited = await enforceRateLimit(req, 'telegram-start', { limit: 10, windowSec: 60 });
  if (limited) return limited;

  // Bot foydalanuvchi havolani ochganda tayyor tursin: webhook shu yerda (bir marta) o'rnatiladi.
  await ensureWebhook(siteUrl());

  const token = newLoginToken();
  const code = newLoginCode();
  await prisma.telegramLogin.create({
    data: {
      tokenHash: hashLoginToken(token),
      code,
      expiresAt: new Date(Date.now() + TELEGRAM_LOGIN_TTL_SEC * 1000),
    },
  });

  return apiOk({
    token,
    code,
    botUrl: `https://t.me/${cfg.username}?start=${token}`,
    expiresInSec: TELEGRAM_LOGIN_TTL_SEC,
  });
}
