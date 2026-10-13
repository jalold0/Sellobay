// POST /api/shipments/:id — sotuvchi (FBS) jo'natmasini «qabul qildim» / «qadoqladim» deb
// belgilaydi (ADR 0015). Omborga topshirishni ombor xodimi tasdiqlaydi (admin «Ombor qabuli»).
//
// To'xtatilgan sotuvchi ham mavjud buyurtmalarni topshirib berishi kerak — mijoz pulni to'lagan;
// shuning uchun bu amal `read` rejimida (katalogni o'zgartirmaydi).

import { ShipmentStateError, sellerAdvanceShipment } from '@ecom/order-ops';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { requireSeller } from '@/lib/seller-access';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ action: z.enum(['accept', 'pack']) });

const HTTP: Record<ShipmentStateError['code'], number> = {
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  INVALID_TRANSITION: 409,
};

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const { seller, err } = await requireSeller(user.id, 'read');
  if (err) return err;

  if (!/^[a-f0-9-]{36}$/i.test(params.id)) {
    return apiError(400, 'VALIDATION', "Jo‘natma ID noto'g'ri");
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'VALIDATION', "Amal noto'g'ri");

  try {
    const status = await prisma.$transaction((tx) =>
      sellerAdvanceShipment(tx, {
        shipmentId: params.id,
        sellerId: seller.id,
        action: parsed.data.action,
      }),
    );
    return apiOk({ shipment: { id: params.id, status } });
  } catch (e) {
    if (e instanceof ShipmentStateError) return apiError(HTTP[e.code], e.code, e.message);
    throw e;
  }
}
