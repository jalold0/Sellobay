// POST /api/orders/:id/carrier/event — 3PL hodisasi (ADR 0015): yetkazilmoqda, yetkazildi yoki
// mijoz topshirishda rad etdi. Hozir admin belgilaydi; provayder webhook'i ulanganda u ham
// aynan `applyCarrierEvent` ni chaqiradi.

import { applyCarrierEvent, CarrierStateError, ConcurrentTransitionError } from '@ecom/order-ops';
import { getPushService } from '@ecom/push';
import { z } from 'zod';

import { assertAdmin } from '@/lib/api-guard';
import { writeAudit } from '@/lib/audit';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('event', [
  z.object({ event: z.literal('OUT_FOR_DELIVERY') }),
  z.object({ event: z.literal('DELIVERED') }),
  z.object({
    event: z.literal('REFUSED'),
    note: z
      .string({ required_error: 'Rad etish sababini yozing' })
      .trim()
      .min(3, 'Rad etish sababini yozing')
      .max(300),
  }),
]);

const HTTP: Record<CarrierStateError['code'], number> = {
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  COURIER_ASSIGNED: 409,
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId } = await assertAdmin();
  if (err) return err;

  if (!/^[a-f0-9-]{36}$/i.test(params.id)) return apiError(400, 'VALIDATION', "ID noto'g'ri");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri so'rov");
  }
  const note = parsed.data.event === 'REFUSED' ? parsed.data.note : undefined;

  let orderStatus: string;
  try {
    orderStatus = await prisma.$transaction(async (tx) => {
      const r = await applyCarrierEvent(tx, {
        orderId: params.id,
        event: parsed.data.event,
        staffUserId: userId,
        note,
      });
      await writeAudit(
        {
          userId,
          action: 'order.carrier',
          resource: 'Order',
          resourceId: params.id,
          meta: { event: parsed.data.event, note: note ?? null },
        },
        tx,
      );
      return r.orderStatus;
    });
  } catch (e) {
    if (e instanceof CarrierStateError) return apiError(HTTP[e.code], e.code, e.message);
    if (e instanceof ConcurrentTransitionError) {
      return apiError(409, 'CONCURRENT_UPDATE', 'Holat allaqachon o‘zgargan — sahifani yangilang');
    }
    throw e;
  }
  await getPushService().notifyOrderStatus(params.id, orderStatus);
  return apiOk({ status: orderStatus });
}
