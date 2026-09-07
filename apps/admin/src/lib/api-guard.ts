// Admin API route'lari uchun umumiy rol qo'riqchisi.
//
// Ilgari bu tekshiruv har bir route faylida qayta-qayta yozilardi (aynan bir
// xil 8 qator). Bitta joyda turgani ma'qul: yangi route yozilganda uni
// qo'shishni unutish qiyinroq bo'ladi va ruxsat ro'yxati bitta joydan
// boshqariladi.

import { apiError } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';

/** Admin API'lariga kirish huquqi bor rollar. */
export const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN'] as const;

export interface AdminGuardResult {
  /** Ruxsat bo'lmasa — tayyor javob; bo'lsa `null`. */
  err: Response | null;
  /** Ruxsat berilgan foydalanuvchi (err === null bo'lganda). */
  userId: string | null;
}

export async function assertAdmin(): Promise<AdminGuardResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { err: apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan'), userId: null };
  }
  if (!user.roles?.some((r) => (ADMIN_ROLES as readonly string[]).includes(r))) {
    return { err: apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)"), userId: null };
  }
  return { err: null, userId: user.id };
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
