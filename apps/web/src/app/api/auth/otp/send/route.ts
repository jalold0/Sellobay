import crypto from 'node:crypto';

import { generateOtpCode, hashOtp } from '@ecom/auth';
import { normalizeUzPhone } from '@ecom/utils';

import { OTP_RESEND_COOLDOWN_SEC, OTP_TTL_MINUTES } from '@/lib/auth/constants';
import { apiError, apiOk } from '@/lib/auth/errors';
import { OTP_SEND_LIMITS, otpSendRetryAfter } from '@/lib/auth/otp-login';
import { phoneLoginAvailable } from '@/lib/auth/sms';
import { otpSendSchema } from '@/lib/auth/validators';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // SMS yuboruvchi yo'q — «kod yuborildi» deb aldamaymiz (audit FUN-01). Mobil ilova
  // ham shu xabarni ko'rsatadi va mijoz email bilan kiradi.
  if (!phoneLoginAvailable()) {
    return apiError(
      503,
      'SMS_UNAVAILABLE',
      'SMS orqali kirish hozircha ishlamaydi — email va parol bilan kiring',
    );
  }

  // SMS-spam himoyasi (IP bo'yicha) — per-telefon cheklov pastda DB'da bor
  const limited = await enforceRateLimit(req, 'otp-send', { limit: 5, windowSec: 60 });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = otpSendSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }
  const normalized = normalizeUzPhone(parsed.data.phone);
  if (!normalized) {
    return apiError(400, 'VALIDATION', "Telefon raqami noto'g'ri (+998XXXXXXXXX kerak)");
  }

  // Spam va taxmin himoyasi raqam bo'yicha (DB'dan — Redis'ga bog'liq emas, audit SEC-05):
  // cooldown ichida bitta kod, soatiga va kuniga chegara (`OTP_SEND_LIMITS`).
  const now = new Date();
  const longestWindowSec = Math.max(...OTP_SEND_LIMITS.map((l) => l.windowSec));
  const sent = await prisma.otpCode.findMany({
    where: {
      recipient: normalized,
      channel: 'PHONE',
      createdAt: { gte: new Date(now.getTime() - longestWindowSec * 1000) },
    },
    select: { createdAt: true },
  });
  const sentAt = sent.map((o) => o.createdAt);
  const capRetry = otpSendRetryAfter(sentAt, now);
  if (capRetry !== null) {
    const res = apiError(
      429,
      'RATE_LIMIT',
      "Bu raqamga juda ko'p kod so'raldi. Keyinroq urinib ko'ring yoki email bilan kiring.",
    );
    res.headers.set('Retry-After', String(capRetry));
    return res;
  }
  const recent = sentAt.some((d) => d.getTime() > now.getTime() - OTP_RESEND_COOLDOWN_SEC * 1000);
  if (recent) {
    const res = apiError(
      429,
      'RATE_LIMIT',
      `Iltimos, ${OTP_RESEND_COOLDOWN_SEC} sekunddan keyin urinib ko'ring`,
    );
    // Klient hisoblagichni shu sarlavhadan oladi. Ilgari bu yo'lda
    // `Retry-After` yo'q edi — faqat IP bo'yicha cheklovda bor edi.
    res.headers.set('Retry-After', String(OTP_RESEND_COOLDOWN_SEC));
    return res;
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

  return apiOk({
    sent: true,
    expiresInSec: OTP_TTL_MINUTES * 60,
    // Qayta yuborish tugmasi shu qiymat bilan bloklanadi.
    resendAfterSec: OTP_RESEND_COOLDOWN_SEC,
  });
}
