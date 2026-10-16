// Telefon + SMS kod bilan kirish qoidalari (audit SEC-04, SEC-05).
//
// SEC-04: raqam profil (PATCH /api/auth/me) yoki ro'yxatdan o'tish orqali TASDIQLANMASDAN
// yozilishi mumkin. Ilgari OTP bilan kirgan odam shu raqam yozilgan HAR QANDAY hisobga
// tushardi: hujumchi qurbonning raqamini o'z hisobiga yozib qo'ysa, qurbon SMS kodi bilan
// hujumchining hisobiga kirib, manzil va karta ma'lumotlarini o'sha yerga kiritardi.
// Endi kod faqat raqami ALLAQACHON tasdiqlangan hisobga kiritadi. Raqam tasdiqlanmagan
// hisobda turgan bo'lsa — egasi kod bilan isbotladi, demak raqam o'sha hisobdan
// bo'shatiladi va egasiga yangi hisob ochiladi (hisob egasi o'z hisobiga email bilan
// kiraveradi; raqamni o'z hisobida tasdiqlashi kerak bo'ladi).
//
// Shuningdek, admin tasdig'ini kutayotgan (PENDING) hisob SMS kod bilan ACTIVE'ga
// o'tmaydi va sessiya olmaydi — ilgari bu sotuvchi tasdig'ini chetlab o'tish yo'li edi.

import crypto from 'node:crypto';

export type OtpLoginUser = {
  // Prisma UserStatus: PENDING | ACTIVE | BLOCKED | DELETED.
  status: string;
  phoneVerifiedAt: Date | null;
};

export type OtpLoginDecision =
  /** Bu raqamli hisob yo'q — yangi (tasdiqlangan) hisob. */
  | 'create'
  /** Raqami tasdiqlangan faol hisob — kirish. */
  | 'login'
  /** Raqam boshqa hisobda tasdiqlanmagan holda — bo'shatib, yangi hisob. */
  | 'release-and-create'
  | 'reject-blocked'
  | 'reject-pending';

export function decideOtpLogin(existing: OtpLoginUser | null): OtpLoginDecision {
  if (!existing) return 'create';
  if (existing.status === 'BLOCKED' || existing.status === 'DELETED') return 'reject-blocked';
  if (existing.phoneVerifiedAt === null) return 'release-and-create';
  if (existing.status !== 'ACTIVE') return 'reject-pending';
  return 'login';
}

/**
 * Bitta raqamga SMS kod yuborish chegaralari (DB bo'yicha — Redis'ga bog'liq emas).
 * Har kodga OTP_MAX_ATTEMPTS urinish: kuniga eng ko'pi 10 × 5 = 50 taxmin, 6 xonali
 * kodni topish ehtimoli kuniga ~0,005%. Ilgari faqat 60 s kutish bor edi — kuniga
 * ~1440 kod × 5 = 7200 taxmin (~0,7%).
 */
export const OTP_SEND_LIMITS = [
  { windowSec: 60 * 60, max: 5 },
  { windowSec: 24 * 60 * 60, max: 10 },
] as const;

/** Oxirgi yuborishlar vaqtlari bo'yicha: ruxsat yoki necha soniyadan keyin. */
export function otpSendRetryAfter(sentAt: readonly Date[], now: Date): number | null {
  for (const { windowSec, max } of OTP_SEND_LIMITS) {
    const from = now.getTime() - windowSec * 1000;
    const inWindow = sentAt
      .filter((d) => d.getTime() > from)
      .sort((a, b) => a.getTime() - b.getTime());
    if (inWindow.length >= max) {
      // Oynadagi eng eski yuborish oynadan chiqqanda joy bo'shaydi.
      const oldest = inWindow[inWindow.length - max]!;
      return Math.max(1, Math.ceil((oldest.getTime() + windowSec * 1000 - now.getTime()) / 1000));
    }
  }
  return null;
}

/** Kod xeshini doimiy vaqtda solishtirish. */
export function otpHashEquals(actualHex: string, expectedHex: string): boolean {
  const a = Buffer.from(actualHex, 'hex');
  const b = Buffer.from(expectedHex, 'hex');
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}
