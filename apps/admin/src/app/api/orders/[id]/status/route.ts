// PATCH /api/orders/[id]/status — buyurtma statusini OLDINGA suradi (admin fulfillment).
// Faqat ADMIN/SUPER_ADMIN. Forward-only holat mashinasi (orqaga qaytish yo'q).
//
// Yon ta'sirlar (atomik $transaction) — fulfillment-server.applyFulfillmentTransition:
//   • SHIPPED / OUT_FOR_DELIVERY → shippedAt
//   • DELIVERED → deliveredAt + soldCount++ va COD bo'lsa Payment PAID + order.paidAt/paidTotal.
// CANCELLED / RETURNED / REFUNDED bu yerda EMAS — mijoz cancel/return route'lari (apps/web)
// zaxirani qaytaradi; refund alohida oqim.

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import {
  applyFulfillmentTransition,
  canTransition,
  ConcurrentTransitionError,
  FULFILLMENT_FLOW,
  FULFILLMENT_TARGETS,
  type FulfillmentStatus,
} from '@/lib/fulfillment-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  status: z.enum(FULFILLMENT_TARGETS as [FulfillmentStatus, ...FulfillmentStatus[]]),
  comment: z.string().trim().max(300).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  if (!user.roles?.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r))) {
    return apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)");
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri status");
  }
  const { status: next, comment } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      number: true,
      status: true,
      grandTotal: true,
      paidAt: true,
      shippedAt: true,
      items: { select: { productId: true, quantity: true } },
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
  if (!canTransition(order.status, next)) {
    return apiError(
      409,
      'INVALID_TRANSITION',
      `${order.status} → ${next} o'tishga ruxsat yo'q (status faqat oldinga suriladi)`,
    );
  }

  let result;
  try {
    result = await prisma.$transaction((tx) =>
      applyFulfillmentTransition(tx, order, next, { changedBy: user.id, comment }),
    );
  } catch (e) {
    if (e instanceof ConcurrentTransitionError) {
      return apiError(409, 'CONCURRENT_UPDATE', 'Buyurtma holati boshqa jarayonda o‘zgardi');
    }
    throw e;
  }

  return apiOk({
    id: order.id,
    number: order.number,
    status: next,
    codSettled: result.codSettled,
    soldCountItems: result.soldCountItems,
  });
}
