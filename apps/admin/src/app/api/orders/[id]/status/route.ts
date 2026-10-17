// PATCH /api/orders/[id]/status — buyurtma statusini OLDINGA suradi (admin fulfillment).
// Faqat ADMIN/SUPER_ADMIN. Qoidalar — @ecom/core-domain `order-fulfillment`:
//   • faqat oldinga, orqaga qaytish yo'q;
//   • PAID qo'lda qo'yilmaydi — uni to'lov oqimlari qo'yadi (Click/Payme webhook,
//     UZCARD chek tasdig'i: PATCH /api/orders/[id]/payment, naqd — yetkazilganda);
//   • oldindan to'lanadigan buyurtma pul tushmaguncha CONFIRMED'dan nariga o'tmaydi.
//
// Yon ta'sirlar (atomik $transaction) — fulfillment-server.applyFulfillmentTransition
// (DELIVERED qismi @ecom/order-ops settleDeliveredOrder — kuryer ilovasi bilan umumiy):
//   • SHIPPED / OUT_FOR_DELIVERY → shippedAt
//   • DELIVERED → deliveredAt + soldCount++ va naqd buyurtmada COD Payment PAID + paidAt/paidTotal.
// CANCELLED / RETURNED / REFUNDED bu yerda EMAS — mijoz cancel/return route'lari (apps/web)
// zaxirani qaytaradi; refund alohida oqim.

import {
  canAdminTransition,
  FULFILLMENT_FLOW,
  orderPaymentState,
  type FulfillmentStatus,
} from '@ecom/core-domain';
import {
  applyFulfillmentTransition,
  ConcurrentTransitionError,
  OpenShipmentsError,
} from '@ecom/order-ops';
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
  status: z.enum(FULFILLMENT_FLOW as unknown as [FulfillmentStatus, ...FulfillmentStatus[]]),
  comment: z.string().trim().max(300).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId } = await requirePermission('orders.manage');
  if (err) return err;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri status");
  }
  const { status: next, comment } = parsed.data;

  if (next === 'PAID') {
    return apiError(
      409,
      'PAID_NOT_MANUAL',
      "PAID qo'lda qo'yilmaydi: uni to'lov tasdig'i qo'yadi (UZCARD cheki — «To'lovni tekshirish», Click/Payme — avtomatik)",
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      number: true,
      status: true,
      paidAt: true,
      shippedAt: true,
      payments: { select: { provider: true, status: true } },
    },
  });
  if (!order) return apiError(404, 'NOT_FOUND', 'Buyurtma topilmadi');

  if (FULFILLMENT_FLOW.indexOf(order.status as FulfillmentStatus) === -1) {
    return apiError(
      409,
      'INVALID_STATE',
      `«${order.status}» holatidagi buyurtmani fulfillment orqali o'zgartirib bo'lmaydi`,
    );
  }

  const payment = orderPaymentState(order);
  if (!canAdminTransition(order.status, next, payment)) {
    if (payment === 'AWAITING_PAYMENT' && next !== 'CONFIRMED') {
      return apiError(
        409,
        'PAYMENT_REQUIRED',
        "To'lov hali tushmagan: oldindan to'lanadigan buyurtma to'lov tasdiqlanmaguncha CONFIRMED'dan nariga o'tmaydi",
      );
    }
    return apiError(
      409,
      'INVALID_TRANSITION',
      `${order.status} → ${next} o'tishga ruxsat yo'q (status faqat oldinga suriladi)`,
    );
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const r = await applyFulfillmentTransition(tx, order, next, { changedBy: userId, comment });
      await writeAudit(
        {
          userId: userId,
          action: 'order.status',
          resource: 'Order',
          resourceId: order.id,
          meta: { from: order.status, to: next, codSettled: r.codSettled },
        },
        tx,
      );
      return r;
    });
  } catch (e) {
    if (e instanceof OpenShipmentsError) {
      return apiError(
        409,
        'SELLER_SHIPMENTS_OPEN',
        `Sotuvchi tovari hali omborga kelmagan (${e.count} ta jo‘natma) — «Ombor qabuli» bo‘limida qabul qiling`,
      );
    }
    if (e instanceof ConcurrentTransitionError) {
      return apiError(409, 'CONCURRENT_UPDATE', 'Buyurtma holati boshqa jarayonda o‘zgardi');
    }
    throw e;
  }

  // Push COMMIT'DAN KEYIN; xato tashlamaydi, javobni buzmaydi.
  await getPushService().notifyOrderStatus(order.id, next);

  return apiOk({
    id: order.id,
    number: order.number,
    status: next,
    codSettled: result.codSettled,
    soldCountItems: result.soldCountItems,
  });
}
