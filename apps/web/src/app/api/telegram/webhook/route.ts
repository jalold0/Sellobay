// POST /api/telegram/webhook — Sellobay botining webhook'i (ADR 0018).
//
// Telegram har so'rovga `X-Telegram-Bot-Api-Secret-Token` sarlavhasini qo'yadi (setWebhook
// `secret_token`) — usiz har kim soxta update yuborib, istalgan raqamni «tasdiqlay» olardi.
// Javob doim 200 (sirdan tashqari): xato bo'lsa Telegram update'ni qayta-qayta yuboradi.

import { t } from '@ecom/i18n';

import { prisma } from '@/lib/db';
import { sendMessage, telegramConfig, type TelegramUpdate } from '@/lib/telegram/bot-api';
import {
  botLocale,
  checkContact,
  hashLoginToken,
  isLoginToken,
  parseStartPayload,
  secretMatches,
} from '@/lib/telegram/login';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ok = () => new Response(null, { status: 200 });

export async function POST(req: NextRequest) {
  const cfg = telegramConfig();
  if (!cfg) return new Response(null, { status: 404 });
  if (!secretMatches(req.headers.get('x-telegram-bot-api-secret-token'), cfg.secret)) {
    return new Response(null, { status: 401 });
  }

  const update = (await req.json().catch(() => null)) as TelegramUpdate | null;
  const msg = update?.message;
  const from = msg?.from;
  // Faqat bot bilan shaxsiy chat — guruhda raqam so'ramaymiz.
  if (!msg || !from || msg.chat.type !== 'private') return ok();

  const locale = botLocale(from.language_code);
  const say = (key: string) => t(`telegramBot.${key}`, locale);
  const chatId = msg.chat.id;
  const telegramId = String(from.id);
  const now = new Date();

  // 1) Kontakt — raqam ulashildi.
  if (msg.contact) {
    const check = checkContact(msg.contact, from.id);
    if (!check.ok) {
      await sendMessage(chatId, say(check.reason === 'not-own' ? 'notOwnContact' : 'notUzNumber'));
      return ok();
    }
    // Shu Telegram foydalanuvchisi ochgan eng so'nggi faol so'rov.
    const pending = await prisma.telegramLogin.findFirst({
      where: { telegramId, verifiedAt: null, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!pending) {
      await sendMessage(chatId, say('noActiveRequest'), { remove_keyboard: true });
      return ok();
    }
    const verified = await prisma.telegramLogin.updateMany({
      where: { id: pending.id, verifiedAt: null, consumedAt: null, expiresAt: { gt: now } },
      data: {
        phone: check.phone,
        firstName: msg.contact.first_name ?? from.first_name ?? null,
        verifiedAt: now,
      },
    });
    await sendMessage(chatId, say(verified.count ? 'done' : 'noActiveRequest'), {
      remove_keyboard: true,
    });
    return ok();
  }

  // 2) /start <token> — saytdan kelgan kirish so'rovi.
  const payload = parseStartPayload(msg.text);
  if (payload === undefined) return ok();
  if (payload === null || !isLoginToken(payload)) {
    await sendMessage(chatId, say('welcome'));
    return ok();
  }

  const login = await prisma.telegramLogin.findUnique({
    where: { tokenHash: hashLoginToken(payload) },
  });
  // So'rovni birinchi ochgan Telegram foydalanuvchisiga bog'laymiz; boshqasi ola olmaydi.
  const claimed =
    login &&
    (await prisma.telegramLogin.updateMany({
      where: {
        id: login.id,
        verifiedAt: null,
        consumedAt: null,
        expiresAt: { gt: now },
        OR: [{ telegramId: null }, { telegramId }],
      },
      data: { telegramId },
    }));
  if (!login || !claimed || claimed.count === 0) {
    await sendMessage(chatId, say('expired'));
    return ok();
  }

  await sendMessage(chatId, t('telegramBot.loginPrompt', locale).replace('{code}', login.code), {
    keyboard: [[{ text: say('shareButton'), request_contact: true }]],
    resize_keyboard: true,
    one_time_keyboard: true,
  });
  return ok();
}
