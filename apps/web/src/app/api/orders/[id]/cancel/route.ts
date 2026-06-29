// POST /api/orders/[id]/cancel — PENDING buyurtmani bekor qilish.
// Yon ta'sirlar atomik qaytariladi: Sello Coins (refund/revoke) + promokod (usedCount, UserCoupon).

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { reverseOrderLoyalty } from '@/lib/loyalty-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ reason: z.string().trim().max(300).optional() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  const reason = parsed.success ? parsed.data.reason : undefined;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: { id: true, number: true, status: true, userId: true, promoCode: true },
  });
  if (!order) return apiError(404, 'NOT_FOUND', 'Buyurtma topilmadi');
  if (order.userId !== user.id) return apiError(403, 'FORBIDDEN', "Ruxsat yo'q");
  if (order.status !== 'PENDING') {
    return apiError(
      409,
      'NOT_CANCELLABLE',
      'Buyurtma allaqachon qabul qilingan — bekor qilib bo‘lmaydi',
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: now,
        cancellationReason: reason ?? 'Mijoz bekor qildi',
        statusHistory: {
          create: { status: 'CANCELLED', comment: reason ?? 'Mijoz bekor qildi' },
        },
      },
    });

    // Sello Coins — refund/revoke
    const loyalty = await reverseOrderLoyalty(tx, user.id, order.number);

    // Promokod — usedCount kamaytirish + UserCoupon redeemed bekor
    if (order.promoCode) {
      const promo = await tx.promoCode.findUnique({
        where: { code: order.promoCode },
        select: { id: true, usedCount: true },
      });
      if (promo) {
        await tx.promoCode.update({
          where: { id: promo.id },
          data: { usedCount: { decrement: promo.usedCount > 0 ? 1 : 0 } },
        });
        await tx.userCoupon.updateMany({
          where: { userId: user.id, promoCodeId: promo.id },
          data: { redeemedAt: null },
        });
      }
    }

    return loyalty;
  });

  return apiOk({
    id: order.id,
    status: 'CANCELLED',
    coinsRefunded: result.refunded,
    coinsRevoked: result.revoked,
  });
}
