import { checkRateLimit, hashOtp } from '@ecom/auth';
import { normalizeUzPhone } from '@ecom/utils';

import { OTP_MAX_ATTEMPTS } from '@/lib/auth/constants';
import { apiError, apiOk } from '@/lib/auth/errors';
import { decideOtpLogin, otpHashEquals } from '@/lib/auth/otp-login';
import { createSession, requestMeta, setCookies } from '@/lib/auth/session';
import { otpVerifySchema } from '@/lib/auth/validators';
import { prisma } from '@/lib/db';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const userSelect = {
  id: true,
  status: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  phoneVerifiedAt: true,
} as const;

export async function POST(req: NextRequest) {
  // OTP kod brute-force himoyasi: bitta IP'dan 60 soniyada 10 urinish
  // (per-kod OTP_MAX_ATTEMPTS va per-raqam yuborish chegarasi bunga qo'shimcha)
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

  // Raqam bo'yicha ham (IP'dan tashqari): ko'p IP'dan bitta raqamga urinish (audit SEC-05).
  const perPhone = await checkRateLimit('otp-verify-phone', normalized, {
    limit: 15,
    windowSec: 15 * 60,
  });
  if (!perPhone.ok) {
    const res = apiError(429, 'RATE_LIMIT', "Ko'p urinish. Birozdan keyin qayta urinib ko'ring.");
    res.headers.set('Retry-After', String(perPhone.retryAfterSec));
    return res;
  }

  const now = new Date();
  const otp = await prisma.otpCode.findFirst({
    where: {
      recipient: normalized,
      channel: 'PHONE',
      // Faqat kirish kodlari — hisobga bog'langan kodlar (kelajakdagi raqam almashtirish) emas.
      userId: null,
      consumedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!otp) {
    return apiError(400, 'OTP_EXPIRED', "Kod muddati o'tgan yoki topilmadi. Yangi kod so'rang.");
  }

  // Urinish solishtirishdan OLDIN atomar band qilinadi (audit SEC-05). Ilgari hisoblagich
  // o'qilib, keyin alohida yozilardi: bir vaqtda yuborilgan ko'p so'rov hammasi «4 ta
  // urinish» ni ko'rib o'tib ketardi va bitta kodga cheksiz taxmin qilish mumkin edi.
  const reserved = await prisma.otpCode.updateMany({
    where: {
      id: otp.id,
      consumedAt: null,
      expiresAt: { gt: now },
      attempts: { lt: OTP_MAX_ATTEMPTS },
    },
    data: { attempts: { increment: 1 } },
  });
  if (reserved.count === 0) {
    return apiError(429, 'OTP_TOO_MANY', "Ko'p urinish. Yangi kod so'rang.");
  }

  const [salt, expectedHash] = otp.codeHash.split(':');
  if (!salt || !expectedHash) {
    return apiError(500, 'OTP_CORRUPT', "Ichki xato. Yangi kod so'rang.");
  }
  if (!otpHashEquals(hashOtp(parsed.data.code, salt), expectedHash)) {
    return apiError(401, 'OTP_INVALID', "Kod noto'g'ri");
  }

  // Kodni iste'mol qilish ham shartli: ikki parallel to'g'ri so'rovdan faqat bittasi o'tadi.
  const consumed = await prisma.otpCode.updateMany({
    where: { id: otp.id, consumedAt: null },
    data: { consumedAt: now },
  });
  if (consumed.count === 0) {
    return apiError(400, 'OTP_EXPIRED', "Kod allaqachon ishlatilgan. Yangi kod so'rang.");
  }

  const existing = await prisma.user.findUnique({
    where: { phone: normalized },
    select: userSelect,
  });

  const decision = decideOtpLogin(existing);
  if (decision === 'reject-blocked') {
    return apiError(403, 'ACCOUNT_BLOCKED', 'Hisob bloklangan');
  }
  if (decision === 'reject-pending') {
    return apiError(403, 'ACCOUNT_PENDING', 'Hisob hali tasdiqlanmagan');
  }

  let user = existing;
  if (decision === 'create' || decision === 'release-and-create') {
    const ip = clientIp(req);
    try {
      user = await prisma.$transaction(async (tx) => {
        if (decision === 'release-and-create' && existing) {
          // Shart UPDATE ichida: shu orada raqam tasdiqlangan bo'lsa — bo'shatmaymiz.
          const released = await tx.user.updateMany({
            where: { id: existing.id, phone: normalized, phoneVerifiedAt: null },
            data: { phone: null },
          });
          if (released.count === 0) throw new PhoneStateChanged();
        }
        const created = await tx.user.create({
          data: {
            phone: normalized,
            firstName: parsed.data.firstName,
            status: 'ACTIVE',
            phoneVerifiedAt: now,
            roles: { create: { role: 'CUSTOMER' } },
          },
          select: userSelect,
        });
        if (decision === 'release-and-create' && existing) {
          await tx.auditLog.create({
            data: {
              userId: created.id,
              action: 'PHONE_RELEASED_UNVERIFIED',
              resource: 'User',
              resourceId: existing.id,
              ipAddress: ip,
              meta: { reason: 'otp-login', newUserId: created.id },
            },
          });
        }
        return created;
      });
    } catch (e) {
      // Raqam holati o'zgargan yoki parallel so'rov hisobni allaqachon ochgan (unique).
      if (e instanceof PhoneStateChanged || isUniqueViolation(e)) {
        return apiError(409, 'OTP_RETRY', "Qayta urinib ko'ring.");
      }
      throw e;
    }
  }

  if (!user) return apiError(500, 'INTERNAL', 'Ichki xato');
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

class PhoneStateChanged extends Error {}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2002';
}
