// POST /api/auth/password — mijoz o'z parolini almashtiradi.
//
// Ilgari profil sozlamalaridagi «Parolni yangilash» tugmasi hech qayerga ulanmagan,
// faqat «parol yangilandi» xabarini ko'rsatardi (audit FUN-04): mijoz parolini
// almashtirdim deb o'ylardi. Admin paneldagi xuddi shu oqim bilan bir xil qoidalar.
//
// Parol almashganda boshqa qurilmalardagi sessiyalar yopiladi (o'g'irlangan parol bilan
// ochilgan sessiya ham), joriy sessiya qoladi.

import { hashPassword, verifyPassword } from '@ecom/auth';
import { cookies } from 'next/headers';
import { z } from 'zod';

import { COOKIE_REFRESH } from '@/lib/auth/constants';
import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser, revokeOtherRefreshTokens } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Joriy parolni kiriting'),
    newPassword: z
      .string()
      .min(8, 'Yangi parol kamida 8 ta belgi')
      .max(128)
      .regex(/[A-Za-z]/, 'Yangi parolda kamida bitta harf bo‘lsin')
      .regex(/\d/, 'Yangi parolda kamida bitta raqam bo‘lsin'),
    // Mobil ilova refresh tokenni cookie'da emas, body'da saqlaydi — uni yuborsa,
    // o'z sessiyasi yopilmaydi.
    refresh: z.string().min(1).max(200).optional(),
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: 'Yangi parol joriysidan farq qilishi kerak',
  });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  // Joriy parolni terib ko'rishdan himoya.
  const limited = await enforceRateLimit(
    req,
    'password',
    { limit: 5, windowSec: 15 * 60 },
    user.id,
  );
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }
  const { currentPassword, newPassword, refresh } = parsed.data;

  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  // Telefon (OTP) bilan ro'yxatdan o'tgan hisobda parol yo'q — almashtiradigan narsa yo'q.
  if (!row?.passwordHash) {
    return apiError(400, 'NO_PASSWORD', 'Bu hisob telefon kodi bilan kiradi — parol o‘rnatilmagan');
  }
  if (!(await verifyPassword(row.passwordHash, currentPassword))) {
    return apiError(400, 'WRONG_PASSWORD', 'Joriy parol noto‘g‘ri');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });
  const signedOut = await revokeOtherRefreshTokens(
    user.id,
    cookies().get(COOKIE_REFRESH)?.value ?? refresh,
  );

  return apiOk({ changed: true, otherSessionsSignedOut: signedOut });
}
