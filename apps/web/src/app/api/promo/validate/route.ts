// POST /api/promo/validate — checkout uchun promokodni tekshirish va chegirmani oldindan hisoblash.
// Hech narsa saqlanmaydi — faqat preview. Yakuniy chegirma order yaratishda qayta hisoblanadi.

import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { evaluatePromo, promoFailMessage } from '@/lib/promo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  code: z.string().trim().min(2).max(40),
  subtotal: z.number().min(0),
  shippingFee: z.number().min(0).default(0),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(400, 'VALIDATION', "Noto'g'ri ma'lumot");

  const { code, subtotal, shippingFee } = parsed.data;
  const promo = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
  if (!promo) {
    return apiOk({ valid: false, reason: 'NOT_FOUND', message: 'Promokod topilmadi' });
  }

  // Login bo'lsa — foydalanuvchining shu kodni ishlatish sonini hisoblaymiz
  const user = await getCurrentUser();
  let userUsedCount: number | undefined;
  if (user) {
    userUsedCount = await prisma.order.count({
      where: { userId: user.id, promoCode: promo.code },
    });
  }

  const result = evaluatePromo(promo, { subtotal, shippingFee, userUsedCount });
  if (!result.ok) {
    return apiOk({
      valid: false,
      reason: result.reason,
      message: promoFailMessage(result.reason),
      minOrderTotal: result.reason === 'MIN_ORDER' ? result.minOrderTotal : undefined,
    });
  }

  return apiOk({
    valid: true,
    code: result.code,
    type: result.type,
    discount: result.discount,
  });
}
