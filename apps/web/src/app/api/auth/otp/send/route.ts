import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { generateOtpCode, hashOtp } from '@ecom/auth';
import { normalizeUzPhone } from '@ecom/utils';
import { prisma } from '@/lib/db';
import { otpSendSchema } from '@/lib/auth/validators';
import { apiError, apiOk } from '@/lib/auth/errors';
import { OTP_TTL_MINUTES } from '@/lib/auth/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = otpSendSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }
  const normalized = normalizeUzPhone(parsed.data.phone);
  if (!normalized) {
    return apiError(400, 'VALIDATION', "Telefon raqami noto'g'ri (+998XXXXXXXXX kerak)");
  }

  // Spam himoyasi: 60 soniya ichida bitta marta
  const recent = await prisma.otpCode.findFirst({
    where: {
      recipient: normalized,
      channel: 'PHONE',
      createdAt: { gte: new Date(Date.now() - 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (recent) {
    return apiError(429, 'RATE_LIMIT', "Iltimos, 60 sekunddan keyin urinib ko'ring");
  }

  const code = generateOtpCode(6);
  const salt = crypto.randomBytes(16).toString('hex');
  const codeHash = `${salt}:${hashOtp(code, salt)}`;
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: {
      channel: 'PHONE',
      recipient: normalized,
      codeHash,
      expiresAt,
    },
  });

  // TODO: Real SMS provider (Eskiz.uz / PlayMobile) integratsiyasi keyinroq.
  // Hozircha development uchun console'ga log qilamiz.
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SMS-MOCK] ${normalized}: Sellobay tasdiqlash kodi ${code}`);
  }

  return apiOk({ sent: true, expiresInSec: OTP_TTL_MINUTES * 60 });
}
