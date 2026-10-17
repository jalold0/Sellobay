// Raqami TASDIQLANGAN odamni tizimga kiritish — SMS kod (otp/verify) va Telegram
// (ADR 0018) uchun umumiy. Raqam qanday tasdiqlangani muhim emas: ikkalasida ham odam
// raqam egasi ekanini isbotlagan. Qoidalar `otp-login.ts` dagi `decideOtpLogin` da
// (audit SEC-04): tasdiqlanmagan hisobga kiritilmaydi, PENDING faollashmaydi.

import { decideOtpLogin } from '@/lib/auth/otp-login';
import { prisma } from '@/lib/db';

const userSelect = {
  id: true,
  status: true,
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
  phoneVerifiedAt: true,
} as const;

export type PhoneLoginUser = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
};

export type PhoneLoginResult =
  | { ok: true; user: PhoneLoginUser; created: boolean }
  | { ok: false; reason: 'blocked' | 'pending' | 'retry' };

export async function loginWithVerifiedPhone(input: {
  phone: string;
  firstName?: string;
  ip?: string;
  /** Qaysi yo'l bilan tasdiqlandi — AuditLog uchun. */
  via: 'otp-login' | 'telegram-login';
  /** Telegram hisobi — UserIdentity(TELEGRAM) sifatida bog'lanadi. */
  telegram?: { id: string; username?: string };
}): Promise<PhoneLoginResult> {
  const { phone, firstName, ip, via, telegram } = input;
  const now = new Date();
  const existing = await prisma.user.findUnique({ where: { phone }, select: userSelect });

  const decision = decideOtpLogin(existing);
  if (decision === 'reject-blocked') return { ok: false, reason: 'blocked' };
  if (decision === 'reject-pending') return { ok: false, reason: 'pending' };

  let user: PhoneLoginUser | null = existing;
  let created = false;
  if (decision === 'create' || decision === 'release-and-create') {
    try {
      user = await prisma.$transaction(async (tx) => {
        if (decision === 'release-and-create' && existing) {
          // Shart UPDATE ichida: shu orada raqam tasdiqlangan bo'lsa — bo'shatmaymiz.
          const released = await tx.user.updateMany({
            where: { id: existing.id, phone, phoneVerifiedAt: null },
            data: { phone: null },
          });
          if (released.count === 0) throw new PhoneStateChanged();
        }
        const newUser = await tx.user.create({
          data: {
            phone,
            firstName,
            status: 'ACTIVE',
            phoneVerifiedAt: now,
            roles: { create: { role: 'CUSTOMER' } },
          },
          select: userSelect,
        });
        if (decision === 'release-and-create' && existing) {
          await tx.auditLog.create({
            data: {
              userId: newUser.id,
              action: 'PHONE_RELEASED_UNVERIFIED',
              resource: 'User',
              resourceId: existing.id,
              ipAddress: ip,
              meta: { reason: via, newUserId: newUser.id },
            },
          });
        }
        return newUser;
      });
      created = true;
    } catch (e) {
      // Raqam holati o'zgargan yoki parallel so'rov hisobni allaqachon ochgan (unique).
      if (e instanceof PhoneStateChanged || isUniqueViolation(e))
        return { ok: false, reason: 'retry' };
      throw e;
    }
  }
  if (!user) return { ok: false, reason: 'retry' };

  if (telegram) await linkTelegram(user.id, telegram);
  return { ok: true, user, created };
}

/**
 * Telegram hisobini foydalanuvchiga bog'laydi. Shu Telegram hisobi boshqa foydalanuvchiga
 * bog'langan bo'lsa (raqamini almashtirgan) — yangi egasiga ko'chiriladi: raqam egasi
 * hozirgina Telegram orqali tasdiqlandi.
 */
async function linkTelegram(userId: string, telegram: { id: string; username?: string }) {
  await prisma.userIdentity.upsert({
    where: { provider_providerUid: { provider: 'TELEGRAM', providerUid: telegram.id } },
    create: {
      userId,
      provider: 'TELEGRAM',
      providerUid: telegram.id,
      meta: telegram.username ? { username: telegram.username } : undefined,
    },
    update: { userId, meta: telegram.username ? { username: telegram.username } : undefined },
  });
}

class PhoneStateChanged extends Error {}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'P2002';
}
