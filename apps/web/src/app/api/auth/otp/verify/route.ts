import { NextRequest } from 'next/server';
import { hashOtp } from '@ecom/auth';
import { normalizeUzPhone } from '@ecom/utils';
import { prisma } from '@/lib/db';
import { otpVerifySchema } from '@/lib/auth/validators';
import { apiError, apiOk } from '@/lib/auth/errors';
import { createSession, requestMeta, setCookies } from '@/lib/auth/session';
import { OTP_MAX_ATTEMPTS } from '@/lib/auth/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
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
  let user = await prisma.user.findUnique({
    where: { phone: normalized },
    select: { id: true, status: true, email: true, phone: true, firstName: true, lastName: true },
  });

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
  } else if (!('phoneVerifiedAt' in user) || user.status === 'PENDING') {
    await prisma.user.update({
      where: { id: user.id },
      data: { phoneVerifiedAt: new Date(), status: 'ACTIVE' },
    });
  }

  if (user.status === 'BLOCKED' || user.status === 'DELETED') {
    return apiError(403, 'ACCOUNT_BLOCKED', 'Hisob bloklangan');
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
