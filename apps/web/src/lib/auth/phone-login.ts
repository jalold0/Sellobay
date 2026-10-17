// Raqami TASDIQLANGAN odamni tizimga kiritish — SMS kod (otp/verify) va Telegram
// (ADR 0018) uchun umumiy. Raqam qanday tasdiqlangani muhim emas: ikkalasida ham odam
// raqam egasi ekanini isbotlagan. Qoidalar `otp-login.ts` dagi `decideOtpLogin` da
// (audit SEC-04): tasdiqlanmagan hisobga to'g'ridan-to'g'ri kiritilmaydi, PENDING
// faollashmaydi, bloklangan rad etiladi.

import { verifyPassword } from '@ecom/auth';

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
  passwordHash: true,
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
  | { ok: false; reason: 'blocked' | 'pending' | 'retry' }
  /** Raqam parolli eski hisobda tasdiqlanmagan — egasi parol bilan bog'lashi mumkin. */
  | { ok: false; reason: 'link-required'; maskedEmail: string | null };

type TelegramRef = { id: string; username?: string };

export async function loginWithVerifiedPhone(input: {
  phone: string;
  firstName?: string;
  lastName?: string;
  ip?: string;
  /** Qaysi yo'l bilan tasdiqlandi — AuditLog uchun. */
  via: 'otp-login' | 'telegram-login';
  /** Telegram hisobi — UserIdentity(TELEGRAM) sifatida bog'lanadi. */
  telegram?: TelegramRef;
  /**
   * Raqam tasdiqlanmagan hisobda bo'lsa: 'release' — raqam bo'shatilib yangi hisob ochiladi;
   * 'offer-link' — hisob parolli va faol bo'lsa, avval parol bilan bog'lash taklif qilinadi
   * (mijoz eski hisobiga qaytadi). Hujumchi o'z hisobiga qurbon raqamini yozgan bo'lsa,
   * qurbon uning parolini bilmaydi — yangi hisob ochadi.
   */
  unverifiedExisting?: 'release' | 'offer-link';
}): Promise<PhoneLoginResult> {
  const { phone, firstName, lastName, ip, via, telegram } = input;
  const now = new Date();
  const existing = await prisma.user.findUnique({ where: { phone }, select: userSelect });

  const decision = decideOtpLogin(existing);
  if (decision === 'reject-blocked') return { ok: false, reason: 'blocked' };
  if (decision === 'reject-pending') return { ok: false, reason: 'pending' };

  if (
    decision === 'release-and-create' &&
    input.unverifiedExisting === 'offer-link' &&
    existing?.passwordHash &&
    existing.status === 'ACTIVE'
  ) {
    return { ok: false, reason: 'link-required', maskedEmail: maskEmail(existing.email) };
  }

  let user: PhoneLoginUser | null = existing ? publicUser(existing) : null;
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
            lastName,
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
        return publicUser(newUser);
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
 * Raqam parolli, faol, lekin raqami tasdiqlanmagan hisobda turibdimi? Turgan bo'lsa —
 * mijozga parol bilan bog'lashni taklif qilamiz (yon ta'sirsiz tekshiruv).
 */
export async function linkOfferFor(phone: string): Promise<{ maskedEmail: string | null } | null> {
  const existing = await prisma.user.findUnique({ where: { phone }, select: userSelect });
  if (existing?.passwordHash && existing.phoneVerifiedAt === null && existing.status === 'ACTIVE') {
    return { maskedEmail: maskEmail(existing.email) };
  }
  return null;
}

export type LinkResult =
  | { ok: true; user: PhoneLoginUser }
  | { ok: false; reason: 'wrong-password' | 'retry' };

/**
 * Raqami tasdiqlanmagan eski hisobga parol bilan qaytish: parol to'g'ri bo'lsa raqam shu
 * hisobda tasdiqlanadi va Telegram bog'lanadi. Urinishlar sonini chaqiruvchi cheklaydi.
 */
export async function linkVerifiedPhoneWithPassword(input: {
  phone: string;
  password: string;
  ip?: string;
  telegram?: TelegramRef;
}): Promise<LinkResult> {
  const existing = await prisma.user.findUnique({
    where: { phone: input.phone },
    select: userSelect,
  });
  if (
    !existing?.passwordHash ||
    existing.phoneVerifiedAt !== null ||
    existing.status !== 'ACTIVE'
  ) {
    return { ok: false, reason: 'retry' };
  }
  if (!(await verifyPassword(existing.passwordHash, input.password))) {
    return { ok: false, reason: 'wrong-password' };
  }

  const verified = await prisma.user.updateMany({
    where: { id: existing.id, phone: input.phone, phoneVerifiedAt: null, status: 'ACTIVE' },
    data: { phoneVerifiedAt: new Date() },
  });
  if (verified.count === 0) return { ok: false, reason: 'retry' };
  await prisma.auditLog.create({
    data: {
      userId: existing.id,
      action: 'PHONE_VERIFIED_LINKED',
      resource: 'User',
      resourceId: existing.id,
      ipAddress: input.ip,
      meta: { via: 'telegram-login' },
    },
  });
  if (input.telegram) await linkTelegram(existing.id, input.telegram);
  return { ok: true, user: publicUser(existing) };
}

/** `ali.valiyev@gmail.com` -> `a***@gmail.com` — mijoz o'z hisobini taniydi, begona bilmaydi. */
export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.indexOf('@');
  if (at < 1) return null;
  return `${email[0]}***${email.slice(at)}`;
}

function publicUser(u: {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
}): PhoneLoginUser {
  return { id: u.id, email: u.email, phone: u.phone, firstName: u.firstName, lastName: u.lastName };
}

/**
 * Telegram hisobini foydalanuvchiga bog'laydi. Shu Telegram hisobi boshqa foydalanuvchiga
 * bog'langan bo'lsa (raqamini almashtirgan) — yangi egasiga ko'chiriladi: raqam egasi
 * hozirgina Telegram orqali tasdiqlandi.
 */
async function linkTelegram(userId: string, telegram: TelegramRef) {
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
