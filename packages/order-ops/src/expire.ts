// To'lanmagan buyurtmalarni avtomatik bekor qilish (audit K4). Qoida — @ecom/core-domain
// `order-expiry`; bu yerda faqat DB amali. Cron endpoint (apps/web) va keyinchalik NestJS
// rejalashtiruvchisi shu funksiyani chaqiradi.

import {
  EXPIRABLE_ORDER_STATUSES,
  isUnpaidOrderExpired,
  UNPAID_ORDER_TTL_HOURS,
} from '@ecom/core-domain';

import { releaseCancelledOrder } from './release';

import type { PrismaClient } from '@ecom/database';

export interface ExpiredOrder {
  id: string;
  number: string;
}

export interface ExpireResult {
  checked: number;
  expired: ExpiredOrder[];
}

const EXPIRE_REASON = "To'lov o'z vaqtida qilinmadi — buyurtma avtomatik bekor qilindi";

/**
 * Muddati o'tgan to'lanmagan buyurtmalarni bekor qiladi: zaxira, coin, promokod qaytadi.
 * Har buyurtma alohida tranzaksiyada — biri yiqilsa qolganlari to'xtamaydi.
 *
 * Poyga (shu payt Click/Payme to'lovi kelsa): holat ATOMIK o'zgartiriladi — faqat hali
 * to'lanmagan va jarayondagi to'lovi yo'q bo'lsa. To'lov birinchi kelsa, bu yerda 0 qator
 * tegadi va buyurtma o'tkazib yuboriladi; bekor qilish birinchi bo'lsa, to'lov webhook'i
 * «buyurtma to'lab bo'lmaydi» javobini oladi (Click/Payme pulni qaytaradi).
 */
export async function expireUnpaidOrders(
  db: PrismaClient,
  opts: { now?: Date; limit?: number } = {},
): Promise<ExpireResult> {
  const now = opts.now ?? new Date();
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const earliest = new Date(now.getTime() - UNPAID_ORDER_TTL_HOURS * 60 * 60 * 1000);

  const candidates = await db.order.findMany({
    where: {
      status: { in: [...EXPIRABLE_ORDER_STATUSES] },
      paidAt: null,
      placedAt: { lte: earliest },
      payments: { none: { status: { in: ['PENDING', 'PAID'] } } },
    },
    orderBy: { placedAt: 'asc' },
    take: limit,
    select: {
      id: true,
      number: true,
      status: true,
      userId: true,
      promoCode: true,
      placedAt: true,
      paidAt: true,
      payments: { select: { provider: true, status: true, failedAt: true } },
    },
  });

  const expired: ExpiredOrder[] = [];
  for (const order of candidates) {
    if (!isUnpaidOrderExpired(order, now)) continue;

    const done = await db.$transaction(async (tx) => {
      const moved = await tx.order.updateMany({
        where: {
          id: order.id,
          status: order.status,
          paidAt: null,
          payments: { none: { status: { in: ['PENDING', 'PAID'] } } },
        },
        data: { status: 'CANCELLED', cancelledAt: now, cancellationReason: EXPIRE_REASON },
      });
      if (moved.count === 0) return false;

      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: 'CANCELLED', comment: EXPIRE_REASON },
      });
      await tx.globalFulfillment.updateMany({
        where: {
          orderId: order.id,
          status: { in: ['NEW', 'PRICE_CHECK', 'PRICE_CHANGED', 'CONFIRMED'] },
        },
        data: { status: 'CANCELLED' },
      });
      await releaseCancelledOrder(tx, order, { restock: true, reason: 'UNPAID_EXPIRED' });
      return true;
    });
    if (done) expired.push({ id: order.id, number: order.number });
  }

  return { checked: candidates.length, expired };
}
