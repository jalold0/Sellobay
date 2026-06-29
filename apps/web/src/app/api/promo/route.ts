// GET  /api/promo — joriy foydalanuvchining promokodlari ("Promokodlarim")
// POST /api/promo — kod bo'yicha promokodni hamyonga qo'shish ("Promokod qo'shish")

import type { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CouponStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'INACTIVE';

function couponStatus(
  promo: { isActive: boolean; endsAt: Date | null },
  redeemedAt: Date | null,
  now: Date,
): CouponStatus {
  if (redeemedAt) return 'USED';
  if (!promo.isActive) return 'INACTIVE';
  if (promo.endsAt && now > promo.endsAt) return 'EXPIRED';
  return 'ACTIVE';
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const coupons = await prisma.userCoupon.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      redeemedAt: true,
      promoCode: {
        select: {
          code: true,
          type: true,
          value: true,
          minOrderTotal: true,
          maxDiscount: true,
          endsAt: true,
          isActive: true,
        },
      },
    },
  });

  const now = new Date();
  return apiOk({
    items: coupons.map((c) => ({
      id: c.id,
      code: c.promoCode.code,
      type: c.promoCode.type,
      value: Number(c.promoCode.value),
      minOrderTotal: c.promoCode.minOrderTotal ? Number(c.promoCode.minOrderTotal) : null,
      maxDiscount: c.promoCode.maxDiscount ? Number(c.promoCode.maxDiscount) : null,
      endsAt: c.promoCode.endsAt?.toISOString() ?? null,
      redeemedAt: c.redeemedAt?.toISOString() ?? null,
      status: couponStatus(c.promoCode, c.redeemedAt, now),
    })),
  });
}

const claimSchema = z.object({ code: z.string().trim().min(2).max(40) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const body = await req.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) return apiError(400, 'VALIDATION', "Noto'g'ri kod");

  const code = parsed.data.code.toUpperCase();
  const promo = await prisma.promoCode.findUnique({
    where: { code },
    select: { id: true, isActive: true, endsAt: true },
  });
  if (!promo) return apiError(404, 'NOT_FOUND', 'Promokod topilmadi');
  if (!promo.isActive) return apiError(400, 'INACTIVE', 'Promokod faol emas');
  if (promo.endsAt && new Date() > promo.endsAt) {
    return apiError(400, 'EXPIRED', 'Promokod muddati tugagan');
  }

  // Idempotent: agar allaqachon qo'shilgan bo'lsa — xato emas, mavjudini qaytaramiz
  const existing = await prisma.userCoupon.findUnique({
    where: { userId_promoCodeId: { userId: user.id, promoCodeId: promo.id } },
    select: { id: true },
  });
  if (existing) return apiOk({ id: existing.id, code, alreadyHad: true });

  const created = await prisma.userCoupon.create({
    data: { userId: user.id, promoCodeId: promo.id },
    select: { id: true },
  });
  return apiOk({ id: created.id, code, alreadyHad: false });
}
