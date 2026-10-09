// POST /api/push/token — qurilma push tokenini ro'yxatdan o'tkazish.
// DELETE /api/push/token — chiqishda tokenni o'chirish.
//
// Token QURILMAGA tegishli, foydalanuvchiga emas: ilovada boshqa hisobga
// kirilsa o'sha token yangi egasiga o'tishi kerak (aks holda oldingi
// foydalanuvchining bildirishnomasi yangi odamga kelardi). Shuning uchun
// `token` bo'yicha upsert qilinadi va `userId` yangilanadi.

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const registerSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(['android', 'ios', 'web']),
  appName: z.enum(['customer', 'courier']),
});

const removeSchema = z.object({
  token: z.string().trim().min(20).max(4096),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const parsed = registerSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }
  const { token, platform, appName } = parsed.data;

  await prisma.pushToken.upsert({
    where: { token },
    create: { token, platform, appName, userId: user.id },
    update: { platform, appName, userId: user.id },
  });

  return apiOk({ registered: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const parsed = removeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }

  // Faqat o'ziniki: boshqaning tokenini o'chirib bo'lmasin.
  await prisma.pushToken.deleteMany({ where: { token: parsed.data.token, userId: user.id } });

  return apiOk({ removed: true });
}
