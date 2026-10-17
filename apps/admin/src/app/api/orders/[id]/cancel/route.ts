// POST /api/orders/[id]/cancel — admin buyurtmani bekor qiladi (tovar hali jo'natilmagan bo'lsa).
//
// Ilgari admin faqat oldinga surardi: PENDING'dan keyingi buyurtmani (masalan mijoz
// telefonda voz kechgan, to'langan, lekin hali qadoqlanmagan) bekor qilishning yo'li yo'q edi —
// zaxira band qolardi (audit Y9). Yon ta'sirlar `@ecom/order-ops` dagi umumiy funksiya bilan:
// zaxira, Sello Coins, promokod, hali yo'lga chiqmagan kuryer topshirig'i, kutilayotgan to'lov.
//
// To'langan buyurtma bekor qilinsa pul AVTOMATIK qaytmaydi — javobda `refundRequired: true`
// va tarixda izoh qoladi; pulni qaytarish alohida amal (pul qaytarish oqimi).

import { canAdminCancel } from '@ecom/core-domain';
import { releaseCancelledOrder } from '@ecom/order-ops';
import { getPushService } from '@ecom/push';
import { z } from 'zod';

import { requirePermission } from '@/lib/api-guard';
import { writeAudit } from '@/lib/audit';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  reason: z.string().trim().min(3, 'Sababni yozing').max(300),
});

class OrderStateChangedError extends Error {
  constructor() {
    super('ORDER_STATE_CHANGED');
    this.name = 'OrderStateChangedError';
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId } = await requirePermission('orders.manage');
  if (err) return err;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Sababni yozing');
  }
  const { reason } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: { id: true, number: true, status: true, userId: true, promoCode: true, paidAt: true },
  });
  if (!order) return apiError(404, 'NOT_FOUND', 'Buyurtma topilmadi');
  // Tovar hali omborda bo'lsagina (qoida @ecom/core-domain'da — admin tugmasi ham shundan).
  if (!canAdminCancel(order.status)) {
    return apiError(
      409,
      'NOT_CANCELLABLE',
      `«${order.status}» holatidagi buyurtmani bekor qilib bo'lmaydi — tovar allaqachon yo'lda yoki yopilgan`,
    );
  }
  const refundRequired = order.paidAt !== null;

  let release;
  try {
    release = await prisma.$transaction(async (tx) => {
      const now = new Date();
      // ATOMIK: faqat o'qilgan holatdan (parallel kuryer/to'lov o'zgartirgan bo'lsa — rollback).
      const moved = await tx.order.updateMany({
        where: { id: order.id, status: order.status },
        data: { status: 'CANCELLED', cancelledAt: now, cancellationReason: reason },
      });
      if (moved.count === 0) throw new OrderStateChangedError();

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          status: 'CANCELLED',
          changedBy: userId,
          comment: refundRequired
            ? `Admin bekor qildi: ${reason}. To'lov qaytarilishi kerak.`
            : `Admin bekor qildi: ${reason}`,
        },
      });

      // Global zayavka hali sotib olinmagan bo'lsa — u ham yopiladi.
      await tx.globalFulfillment.updateMany({
        where: {
          orderId: order.id,
          status: { in: ['NEW', 'PRICE_CHECK', 'PRICE_CHANGED', 'CONFIRMED'] },
        },
        data: { status: 'CANCELLED' },
      });

      await writeAudit(
        {
          userId: userId,
          action: 'order.cancel',
          resource: 'Order',
          resourceId: order.id,
          meta: { from: order.status, reason, refundRequired },
        },
        tx,
      );
      return releaseCancelledOrder(tx, order, { restock: true, reason: `ADMIN_CANCEL: ${reason}` });
    });
  } catch (e) {
    if (e instanceof OrderStateChangedError) {
      return apiError(409, 'CONCURRENT_UPDATE', 'Buyurtma holati boshqa jarayonda o‘zgardi');
    }
    throw e;
  }

  // Push COMMIT'DAN KEYIN; xato tashlamaydi.
  await getPushService().notifyOrderStatus(order.id, 'CANCELLED');

  return apiOk({
    id: order.id,
    number: order.number,
    status: 'CANCELLED',
    refundRequired,
    stockRestocked: release.stock.restocked,
    coinsRefunded: release.loyalty.refunded,
    coinsRevoked: release.loyalty.revoked,
  });
}
