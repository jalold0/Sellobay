// POST /api/orders/:id/carrier — buyurtma 3PL'ga topshirildi (ADR 0015).
//
// Hozircha «qo'lda» provayder: admin kompaniya nomi va trek raqamini kiritadi. Provayder API'si
// ulanganda shu route uning `register` chaqiruvini ishlatadi (jo'natma yaratish, yorliq).

import { isValidTrackingNumber } from '@ecom/core-domain';
import {
  CarrierStateError,
  ConcurrentTransitionError,
  getShippingProvider,
  handOverToCarrier,
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
  provider: z.literal('MANUAL').default('MANUAL'),
  company: z.string().trim().min(2, 'Kompaniya nomini yozing').max(60),
  trackingNumber: z
    .string()
    .trim()
    .refine(isValidTrackingNumber, 'Trek raqami: 4–40 ta harf, raqam yoki «-»'),
});

const HTTP: Record<CarrierStateError['code'], number> = {
  NOT_FOUND: 404,
  INVALID_TRANSITION: 409,
  COURIER_ASSIGNED: 409,
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId } = await requirePermission('orders.manage');
  if (err) return err;

  if (!/^[a-f0-9-]{36}$/i.test(params.id)) return apiError(400, 'VALIDATION', "ID noto'g'ri");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri so'rov");
  }
  const { provider: code, company, trackingNumber } = parsed.data;
  const provider = getShippingProvider(code);
  if (!provider) return apiError(400, 'UNKNOWN_PROVIDER', 'Noma’lum provayder');

  // Provayderda ro'yxatdan o'tkazish — tarmoq chaqiruvi, tranzaksiyadan oldin.
  const registration = await provider.register({ orderId: params.id, trackingNumber });

  try {
    await prisma.$transaction(async (tx) => {
      await handOverToCarrier(tx, {
        orderId: params.id,
        provider: provider.code,
        companyName: company,
        registration,
        staffUserId: userId,
      });
      await writeAudit(
        {
          userId,
          action: 'order.carrier',
          resource: 'Order',
          resourceId: params.id,
          meta: { event: 'HANDED_OVER', company, trackingNumber: registration.trackingNumber },
        },
        tx,
      );
    });
  } catch (e) {
    if (e instanceof CarrierStateError) return apiError(HTTP[e.code], e.code, e.message);
    if (e instanceof OpenShipmentsError) {
      return apiError(409, 'SELLER_SHIPMENTS_OPEN', 'Sotuvchi tovari hali omborga kelmagan');
    }
    if (e instanceof ConcurrentTransitionError) {
      return apiError(409, 'CONCURRENT_UPDATE', 'Holat allaqachon o‘zgargan — sahifani yangilang');
    }
    throw e;
  }
  await getPushService().notifyOrderStatus(params.id, 'SHIPPED');
  return apiOk({ status: 'SHIPPED', trackingNumber: registration.trackingNumber });
}
