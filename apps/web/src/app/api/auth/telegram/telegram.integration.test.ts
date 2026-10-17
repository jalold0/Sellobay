/**
 * Telegram orqali kirish — haqiqiy Postgres bilan (ADR 0018).
 *
 * Faqat `TEST_DATABASE_URL` berilganda ishlaydi — migratsiya qilingan BO'SH test bazasi
 * (otp.integration.test.ts dagi buyruqlarga qarang). Telegram API chaqirilmaydi:
 * `sendMessage` soxtalashtirilgan, bot javoblari shu yerda tekshiriladi.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '@ecom/database';
import type { NextRequest } from 'next/server';

const DB = process.env.TEST_DATABASE_URL;
// Har ishga tushirishda noyob raqamlar — test bazasini tozalamasdan qayta-qayta ishlatish mumkin.
const RUN = String(Date.now() % 100_000).padStart(5, '0');
const testPhone = (n: number) => `+99890${RUN}${String(n).padStart(2, '0')}`;
const tg = (n: number) => Number(RUN) * 10_000 + n;
const SECRET = 'test-webhook-secret-0123456789';

vi.mock('@/lib/auth/session', () => ({
  createSession: vi.fn(async () => ({ access: 'a', refresh: 'r' })),
  requestMeta: vi.fn(() => ({})),
  setCookies: vi.fn(),
}));

const sent: { chatId: number; text: string; markup?: unknown }[] = [];
vi.mock('@/lib/telegram/bot-api', async (orig) => ({
  ...(await orig<typeof import('@/lib/telegram/bot-api')>()),
  sendMessage: vi.fn(async (chatId: number, text: string, markup?: unknown) => {
    sent.push({ chatId, text, markup });
  }),
}));

describe.skipIf(!DB)('Telegram orqali kirish (integratsiya)', () => {
  let prisma: PrismaClient;
  let start: (req: NextRequest) => Promise<Response>;
  let poll: (req: NextRequest) => Promise<Response>;
  let webhook: (req: NextRequest) => Promise<Response>;
  let ipSeq = 0;

  const req = (body: unknown, headers: Record<string, string> = {}) => {
    ipSeq += 1;
    return new Request('http://test/api', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `10.1.${ipSeq >> 8}.${ipSeq & 255}`,
        ...headers,
      },
      body: JSON.stringify(body),
    }) as unknown as NextRequest;
  };
  const hook = (update: unknown, secret = SECRET) =>
    webhook(req(update, { 'x-telegram-bot-api-secret-token': secret }));
  const startCmd = (fromId: number, token: string) =>
    hook({
      message: {
        chat: { id: fromId, type: 'private' },
        from: { id: fromId, first_name: 'Ali' },
        text: `/start ${token}`,
      },
    });
  const shareContact = (fromId: number, phone: string, userId: number = fromId) =>
    hook({
      message: {
        chat: { id: fromId, type: 'private' },
        from: { id: fromId, first_name: 'Ali' },
        contact: { phone_number: phone, user_id: userId, first_name: 'Ali' },
      },
    });
  const newLogin = async () => {
    const res = await start(req({}));
    expect(res.status).toBe(200);
    return ((await res.json()) as { data: { token: string; code: string; botUrl: string } }).data;
  };
  const pollStatus = async (token: string) => {
    const res = await poll(req({ token }));
    const body = (await res.json()) as { data?: { status: string; user?: { id: string } } };
    return { status: res.status, data: body.data };
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = DB;
    process.env.TELEGRAM_BOT_TOKEN = '123:test';
    process.env.TELEGRAM_BOT_USERNAME = 'SellobayTestBot';
    process.env.TELEGRAM_WEBHOOK_SECRET = SECRET;
    ({ prisma } = (await import('@/lib/db')) as unknown as { prisma: PrismaClient });
    ({ POST: start } = await import('./start/route'));
    ({ POST: poll } = await import('./poll/route'));
    ({ POST: webhook } = await import('../../telegram/webhook/route'));
    // Route modullarini sovuq import qilish butun to'plam parallel ishlaganda 10 s dan oshadi.
  }, 60_000);
  beforeEach(() => {
    sent.length = 0;
  });
  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('to`liq oqim: start -> /start -> raqam -> poll — tasdiqlangan hisob + Telegram bog`landi', async () => {
    const { token, code, botUrl } = await newLogin();
    expect(botUrl).toBe(`https://t.me/SellobayTestBot?start=${token}`);
    expect((await pollStatus(token)).status).toBe(202);

    expect((await startCmd(tg(1001), token)).status).toBe(200);
    expect(sent.at(-1)?.text).toContain(code);
    expect(JSON.stringify(sent.at(-1)?.markup)).toContain('request_contact');

    await shareContact(tg(1001), testPhone(1).slice(1));
    const done = await pollStatus(token);
    expect(done.status).toBe(200);
    expect(done.data?.status).toBe('ok');

    const user = await prisma.user.findUnique({ where: { phone: testPhone(1) } });
    expect(user?.id).toBe(done.data?.user?.id);
    expect(user?.phoneVerifiedAt).not.toBeNull();
    const identity = await prisma.userIdentity.findUnique({
      where: { provider_providerUid: { provider: 'TELEGRAM', providerUid: String(tg(1001)) } },
    });
    expect(identity?.userId).toBe(user?.id);

    // So'rov bir martalik.
    expect((await pollStatus(token)).status).toBe(410);
  });

  it('webhook siri noto`g`ri — 401, hech narsa yozilmaydi', async () => {
    const { token } = await newLogin();
    const res = await hook(
      { message: { chat: { id: 5, type: 'private' }, from: { id: 5 }, text: `/start ${token}` } },
      'wrong-secret',
    );
    expect(res.status).toBe(401);
    const row = await prisma.telegramLogin.findFirst({ where: { telegramId: '5' } });
    expect(row).toBeNull();
  });

  it('begona kontakt (user_id boshqa) — raqam yozilmaydi', async () => {
    const { token } = await newLogin();
    await startCmd(tg(1002), token);
    await shareContact(tg(1002), testPhone(2).slice(1), 9999);
    expect((await pollStatus(token)).status).toBe(202);
    expect(await prisma.user.findUnique({ where: { phone: testPhone(2) } })).toBeNull();
  });

  it('havolani boshqa Telegram foydalanuvchisi «egallay» olmaydi', async () => {
    const { token } = await newLogin();
    await startCmd(tg(1003), token);
    await startCmd(tg(2003), token); // havolani qo'lga kiritgan boshqa odam
    await shareContact(tg(2003), testPhone(3).slice(1));
    expect((await pollStatus(token)).status).toBe(202);
    expect(await prisma.user.findUnique({ where: { phone: testPhone(3) } })).toBeNull();
  });

  it('eskirgan so`rov — bot rad etadi, poll 410', async () => {
    const { token } = await newLogin();
    await prisma.telegramLogin.updateMany({
      data: { expiresAt: new Date(Date.now() - 1000) },
      where: { code: { not: '' }, telegramId: null, verifiedAt: null },
    });
    await startCmd(tg(1004), token);
    expect(sent.at(-1)?.markup).toBeUndefined();
    expect((await pollStatus(token)).status).toBe(410);
  });

  it('SEC-04 qoidasi Telegram uchun ham: tasdiqlanmagan raqamli hisobga kiritmaydi', async () => {
    const squatter = await prisma.user.create({
      data: {
        email: `squat-tg-${RUN}@test.local`,
        phone: testPhone(5),
        status: 'ACTIVE',
        phoneVerifiedAt: null,
      },
    });
    const { token } = await newLogin();
    await startCmd(tg(1005), token);
    await shareContact(tg(1005), testPhone(5).slice(1));
    const done = await pollStatus(token);
    expect(done.status).toBe(200);
    expect(done.data?.user?.id).not.toBe(squatter.id);
    expect((await prisma.user.findUnique({ where: { id: squatter.id } }))?.phone).toBeNull();
  });

  it('noto`g`ri token bilan poll — 400; guruh chatidagi xabar e`tiborsiz', async () => {
    expect((await poll(req({ token: 'short' }))).status).toBe(400);
    const res = await hook({
      message: { chat: { id: -5, type: 'group' }, from: { id: 1 }, text: '/start x' },
    });
    expect(res.status).toBe(200);
    expect(sent.length).toBe(0);
  });
});
