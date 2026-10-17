// Admin API route'lari uchun umumiy ruxsat qo'riqchisi (ADR 0019).
//
// Har bir route bitta ruxsatni talab qiladi: `requirePermission('orders.manage')`.
// Qaysi rol qaysi ruxsatga ega — faqat `lib/permissions.ts` da. Ilgari har route'da
// `['ADMIN','SUPER_ADMIN']` qo'lda yozilardi va panel boshqa bo'lim xodimlariga yopiq edi.

import { apiError } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { can, isStaff, type Permission } from '@/lib/permissions';

/** Ruxsat bo'lmasa — tayyor javob (`err`); bo'lsa — foydalanuvchi id'si (`userId`). */
export type AdminGuardResult =
  | { err: Response; userId: null; roles: null }
  | { err: null; userId: string; roles: string[] };

export async function requirePermission(permission: Permission): Promise<AdminGuardResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      err: apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan'),
      userId: null,
      roles: null,
    };
  }
  if (!isStaff(user.roles)) {
    return { err: apiError(403, 'FORBIDDEN', "Ruxsat yo'q"), userId: null, roles: null };
  }
  // Vaqtinchalik parol bilan kirgan xodim avval o'z parolini qo'yadi — boshqa amal yo'q.
  if (user.mustChangePassword) {
    return {
      err: apiError(403, 'PASSWORD_CHANGE_REQUIRED', 'Avval vaqtinchalik parolni almashtiring'),
      userId: null,
      roles: null,
    };
  }
  if (!can(user.roles, permission)) {
    return {
      err: apiError(403, 'FORBIDDEN', "Bu bo'lim sizning rolingiz uchun yopiq"),
      userId: null,
      roles: null,
    };
  }
  return { err: null, userId: user.id, roles: user.roles };
}

/**
 * Slug hosil qiladi. `@ecom/utils/slugify` bilan bir xil qoida:
 * kichik harf, lotin bo'lmagan belgilar chiziqchaga.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9Ѐ-ӿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
