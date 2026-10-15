import { hashOtp } from '@ecom/auth';
import { normalizeUzPhone } from '@ecom/utils';

import { OTP_MAX_ATTEMPTS } from '@/lib/auth/constants';
import { apiError, apiOk } from '@/lib/auth/errors';
import { createSession, requestMeta, setCookies } from '@/lib/auth/session';
import { otpVerifySchema } from '@/lib/auth/validators';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // OTP kod brute-force himoyasi: bitta IP'dan 60 soniyada 10 urinish
  // (per-kod OTP_MAX_ATTEMPTS bunga qo'shimcha ravishda ishlaydi)
  const limited = await enforceRateLimit(req, 'otp-verify', { limit: 10, windowSec: 60 });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = otpVerifySchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }
  const normalized = normalizeUzPhone(parsed.data.phone);
  if (!normalized) {
    return apiError(400, 'VALIDATION', "Telefon raqami noto'g'ri");
  }

  const otp = await prisma.otpCode.findFirst({
    where: {
      recipient: normalized,
      channel: 'PHONE',
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!otp) {
    return apiError(400, 'OTP_EXPIRED', "Kod muddati o'tgan yoki topilmadi. Yangi kod so'rang.");
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    return apiError(429, 'OTP_TOO_MANY', "Ko'p urinish. Yangi kod so'rang.");
  }

  const [salt, expectedHash] = otp.codeHash.split(':');
  if (!salt || !expectedHash) {
    return apiError(500, 'OTP_CORRUPT', "Ichki xato. Yangi kod so'rang.");
  }
  const actualHash = hashOtp(parsed.data.code, salt);

  if (actualHash !== expectedHash) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return apiError(401, 'OTP_INVALID', "Kod noto'g'ri");
  }

  // Kodni iste'mol qilingan deb belgilaymiz
  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });

  // User'ni topamiz yoki yaratamiz (auto-register on first OTP)
  const existing = await prisma.user.findUnique({
    where: { phone: normalized },
    select: {
      id: true,
      status: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      phoneVerifiedAt: true,
    },
  });

  // Bloklangan/o'chirilgan hisob — HECH NARSA yozmasdan rad etamiz. Ilgari tekshiruv
  // yangilashdan KEYIN edi va `select` da `phoneVerifiedAt` yo'qligi sababli har bir
  // OTP kirish holatni ACTIVE ga qaytarardi: ikkinchi urinishda admin bloki bekor
  // bo'lardi (audit SEC-02).
  if (existing && (existing.status === 'BLOCKED' || existing.status === 'DELETED')) {
    return apiError(403, 'ACCOUNT_BLOCKED', 'Hisob bloklangan');
  }

  let user: Omit<NonNullable<typeof existing>, 'phoneVerifiedAt'> | null = existing;
  if (!user) {
    const created = await prisma.user.create({
      data: {
        phone: normalized,
        firstName: parsed.data.firstName,
        status: 'ACTIVE',
        phoneVerifiedAt: new Date(),
        roles: { create: { role: 'CUSTOMER' } },
      },
      select: { id: true, status: true, email: true, phone: true, firstName: true, lastName: true },
    });
    user = created;
  } else if (existing && (existing.phoneVerifiedAt === null || existing.status === 'PENDING')) {
    // Raqam endi tasdiqlandi. Holat FAQAT `PENDING` dan `ACTIVE` ga o'tadi; shart
    // UPDATE ichida ham — parallel admin bloki shu orada yozilsa, uni bosib ketmaymiz.
    await prisma.user.updateMany({
      where: { id: existing.id, status: { in: ['PENDING', 'ACTIVE'] } },
      data: {
        ...(existing.phoneVerifiedAt === null ? { phoneVerifiedAt: new Date() } : {}),
        ...(existing.status === 'PENDING' ? { status: 'ACTIVE' as const } : {}),
      },
    });
  }

  const tokens = await createSession(user.id, requestMeta());
  const res = apiOk({
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
