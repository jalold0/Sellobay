/**
 * OTP kirish — haqiqiy Postgres bilan (audit SEC-04, SEC-05).
 *
 * Faqat `TEST_DATABASE_URL` berilganda ishlaydi (aks holda o'tkazib yuboriladi) — baza
 * migratsiya qilingan BO'SH test bazasi bo'lishi kerak, test unga yozadi. Masalan:
 *   docker run -d --rm --name otp-test -e POSTGRES_PASSWORD=t -p 55432:5432 postgres:16-alpine
 *   DATABASE_URL=postgresql://postgres:t@localhost:55432/postgres pnpm --filter @ecom/database migrate:deploy
 *   TEST_DATABASE_URL=postgresql://postgres:t@localhost:55432/postgres pnpm --filter @ecom/web exec vitest run otp.integration
 */
import crypto from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { PrismaClient } from '@ecom/database';
import type { NextRequest } from 'next/server';

const DB = process.env.TEST_DATABASE_URL;
// Har ishga tushirishda noyob raqamlar — test bazasini tozalamasdan qayta-qayta ishlatish mumkin.
const RUN = String(Date.now() % 100_000).padStart(5, '0');
const testPhone = (n: number) => `+99890${RUN}${String(n).padStart(2, '0')}`;

// Sessiya (cookie, next/headers) bu testning mavzusi emas.
vi.mock('@/lib/auth/session', () => ({
  createSession: vi.fn(async () => ({ access: 'a', refresh: 'r' })),
  requestMeta: vi.fn(() => ({})),
  setCookies: vi.fn(),
}));

describe.skipIf(!DB)('OTP kirish (integratsiya)', () => {
  let prisma: PrismaClient;
  let send: (req: NextRequest) => Promise<Response>;
  let verify: (req: NextRequest) => Promise<Response>;
  let hashOtp: (code: string, salt: string) => string;
  let ipSeq = 0;

  const req = (body: unknown) => {
    // Har so'rovga boshqa IP — IP bo'yicha cheklov raqam bo'yicha himoyani yashirmasin.
    ipSeq += 1;
    return new Request('http://test/api', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `10.0.${ipSeq >> 8}.${ipSeq & 255}`,
      },
      body: JSON.stringify(body),
    }) as unknown as NextRequest;
  };

  /** Ma'lum kod bilan kirish kodi yozadi (SMS yo'q). */
  const plantCode = async (phone: string, code: string) => {
    const salt = crypto.randomBytes(16).toString('hex');
    return prisma.otpCode.create({
      data: {
        channel: 'PHONE',
        recipient: phone,
        codeHash: `${salt}:${hashOtp(code, salt)}`,
        expiresAt: new Date(Date.now() + 5 * 60_000),
      },
    });
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = DB;
    ({ prisma } = (await import('@/lib/db')) as unknown as { prisma: PrismaClient });
    ({ POST: send } = await import('./send/route'));
    ({ POST: verify } = await import('./verify/route'));
    ({ hashOtp } = await import('@ecom/auth'));
    // Route modullarini sovuq import qilish butun to'plam parallel ishlaganda 10 s dan oshadi.
  }, 60_000);

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it('SEC-04: raqam tasdiqlanmagan hisobga kiritmaydi — raqam bo`shatiladi, egasiga yangi hisob', async () => {
    const phone = testPhone(1);
    const attacker = await prisma.user.create({
      data: {
        email: `attacker-sec04-${RUN}@test.local`,
        phone,
        status: 'ACTIVE',
        phoneVerifiedAt: null,
      },
    });
    await plantCode(phone, '123456');

    const res = await verify(req({ phone, code: '123456' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: { user: { id: string } }; user?: { id: string } };
    const loggedIn = (body.data ?? body).user!.id;

    expect(loggedIn).not.toBe(attacker.id);
    const after = await prisma.user.findUnique({ where: { id: attacker.id } });
    expect(after?.phone).toBeNull();
    const owner = await prisma.user.findUnique({ where: { phone } });
    expect(owner?.id).toBe(loggedIn);
    expect(owner?.phoneVerifiedAt).not.toBeNull();
    const audit = await prisma.auditLog.findFirst({ where: { resourceId: attacker.id } });
    expect(audit?.action).toBe('PHONE_RELEASED_UNVERIFIED');
  });

  it('raqami tasdiqlangan faol hisobga kiritadi', async () => {
    const phone = testPhone(2);
    const owner = await prisma.user.create({
      data: { phone, status: 'ACTIVE', phoneVerifiedAt: new Date() },
    });
    await plantCode(phone, '222222');
    const res = await verify(req({ phone, code: '222222' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: { user: { id: string } }; user?: { id: string } };
    expect((body.data ?? body).user!.id).toBe(owner.id);
  });

  it('tasdiq kutayotgan (PENDING) hisob faollashmaydi', async () => {
    const phone = testPhone(3);
    const pending = await prisma.user.create({
      data: { phone, status: 'PENDING', phoneVerifiedAt: new Date() },
    });
    await plantCode(phone, '333333');
    const res = await verify(req({ phone, code: '333333' }));
    expect(res.status).toBe(403);
    expect((await prisma.user.findUnique({ where: { id: pending.id } }))?.status).toBe('PENDING');
  });

  it('SEC-05: 20 ta parallel noto`g`ri urinish — hisoblagich OTP_MAX_ATTEMPTS dan oshmaydi', async () => {
    const phone = testPhone(4);
    const otp = await plantCode(phone, '444444');
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) => verify(req({ phone, code: String(100000 + i) }))),
    );
    const statuses = results.map((r) => r.status);
    // Faqat 5 tasi solishtirishgacha yetadi (401), qolgani 429.
    expect(statuses.filter((s) => s === 401).length).toBe(5);
    expect(statuses.filter((s) => s === 429).length).toBe(15);
    expect((await prisma.otpCode.findUnique({ where: { id: otp.id } }))?.attempts).toBe(5);
    // To'g'ri kod ham endi o'tmaydi — yangi kod kerak.
    expect((await verify(req({ phone, code: '444444' }))).status).toBe(429);
  });

  it('SEC-05: to`g`ri kod bilan ikki parallel so`rov — faqat bittasi kiradi', async () => {
    const phone = testPhone(5);
    await prisma.user.create({ data: { phone, status: 'ACTIVE', phoneVerifiedAt: new Date() } });
    await plantCode(phone, '555555');
    const [a, b] = await Promise.all([
      verify(req({ phone, code: '555555' })),
      verify(req({ phone, code: '555555' })),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 400]);
  });

  it('SEC-05: bitta raqamga soatiga 5 tadan ortiq kod yuborilmaydi', async () => {
    const phone = testPhone(6);
    // 5 ta kod oxirgi soatda (cooldown'dan tashqarida) yuborilgan.
    for (let i = 0; i < 5; i++) {
      await prisma.otpCode.create({
        data: {
          channel: 'PHONE',
          recipient: phone,
          codeHash: 'x:y',
          expiresAt: new Date(),
          createdAt: new Date(Date.now() - (10 + i * 10) * 60_000),
        },
      });
    }
    const res = await send(req({ phone }));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get('Retry-After'))).toBeGreaterThan(60);
    // Boshqa raqam — ruxsat.
    expect((await send(req({ phone: testPhone(7) }))).status).toBe(200);
  });
});
