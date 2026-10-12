// POST /api/orders/[id]/cancel — PENDING buyurtmani bekor qilish.
// Yon ta'sirlar atomik qaytariladi (`releaseCancelledOrder`): zaxira, Sello Coins, promokod,
// hali yo'lga chiqmagan kuryer topshirig'i va kutilayotgan offline to'lov.

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { releaseCancelledOrder } from '@/lib/order-release-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ reason: z.string().trim().max(300).optional() });

/** Parallel so'rov holatni allaqachon o'zgartirgan bo'lsa — tx rollback qilinadi. */
class OrderStateChangedError extends Error {
  constructor() {
    super('ORDER_STATE_CHANGED');
    this.name = 'OrderStateChangedError';
  }
}

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

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // ATOMIK holat o'tishi — faqat hali PENDING bo'lsa. Parallel (double-click) cancel'da
      // ikkinchisi count===0 oladi va butun tx rollback bo'ladi (double restock/refund oldini oladi).
      const moved = await tx.order.updateMany({
        where: { id: order.id, status: 'PENDING' },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
          cancellationReason: reason ?? 'Mijoz bekor qildi',
        },
      });
      if (moved.count === 0) throw new OrderStateChangedError();

      await tx.order.update({
        where: { id: order.id },
        data: {
          statusHistory: {
            create: { status: 'CANCELLED', comment: reason ?? 'Mijoz bekor qildi' },
          },
        },
      });

      // Zaxira, coin, promo, kuryer topshirig'i va kutilayotgan to'lov — bitta joyda
      return releaseCancelledOrder(tx, order, {
        restock: true,
        reason: reason ?? 'Mijoz bekor qildi',
      });
    });
  } catch (e) {
    if (e instanceof OrderStateChangedError) {
      return apiError(409, 'NOT_CANCELLABLE', 'Buyurtma allaqachon qayta ishlangan');
    }
    throw e;
  }

  return apiOk({
    id: order.id,
    status: 'CANCELLED',
    coinsRefunded: result.loyalty.refunded,
    coinsRevoked: result.loyalty.revoked,
    stockRestocked: result.stock.restocked,
  });
}
