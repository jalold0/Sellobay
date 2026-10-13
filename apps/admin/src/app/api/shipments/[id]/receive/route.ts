// POST /api/shipments/:id/receive — ombor jo'natmani qabul qildi (FBS) yoki yig'di (FBO).
// Buyurtmaning hamma jo'natmasi omborda bo'lsa buyurtma «Qadoqlandi» bo'ladi va yetkazishga
// (kuryer/3PL ro'yxatiga) chiqadi (ADR 0015).

import { receiveSellerShipment, ShipmentStateError } from '@ecom/order-ops';
import { getPushService } from '@ecom/push';

import { assertAdmin } from '@/lib/api-guard';
import { writeAudit } from '@/lib/audit';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HTTP: Record<ShipmentStateError['code'], number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  INVALID_TRANSITION: 409,
};

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId } = await assertAdmin();
  if (err) return err;

  if (!/^[a-f0-9-]{36}$/i.test(params.id)) {
    return apiError(400, 'VALIDATION', "Jo‘natma ID noto'g'ri");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const r = await receiveSellerShipment(tx, { shipmentId: params.id, staffUserId: userId });
      await writeAudit(
        {
          userId,
          action: 'shipment.receive',
          resource: 'SellerShipment',
          resourceId: params.id,
          meta: { orderId: r.orderId, orderReady: r.orderReady, orderPacked: r.orderPacked },
        },
        tx,
      );
      return r;
    });
    // Mijozga — «buyurtmangiz yig'ildi» (admin holat o'zgartirgandagi bilan bir xil xabar).
    if (result.orderPacked) await getPushService().notifyOrderStatus(result.orderId, 'PACKED');
    return apiOk(result);
  } catch (e) {
    if (e instanceof ShipmentStateError) return apiError(HTTP[e.code], e.code, e.message);
    throw e;
  }
}
