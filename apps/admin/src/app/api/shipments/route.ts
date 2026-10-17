// GET /api/shipments — omborga hali kelmagan sotuvchi jo'natmalari (ADR 0015).
//
// «Ombor qabuli» sahifasi uchun: sotuvchi qadoqlab olib kelgan (FBS, PACKED) — qabul qilinadi;
// ombor o'zi yig'adigan (FBO) — yig'ilgach belgilanadi; sotuvchida turgan (FBS, NEW/ACCEPTED) —
// muddati kuzatiladi, kechiksa sotuvchiga qo'ng'iroq qilinadi.

import { OPEN_SHIPMENT_STATUSES } from '@ecom/order-ops';

import { requirePermission } from '@/lib/api-guard';
import { apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { err } = await requirePermission('warehouse.manage');
  if (err) return err;

  const rows = await prisma.sellerShipment.findMany({
    where: { status: { in: OPEN_SHIPMENT_STATUSES } },
    orderBy: { deadlineAt: 'asc' },
    take: 300,
    select: {
      id: true,
      fulfillmentModel: true,
      status: true,
      deadlineAt: true,
      packedAt: true,
      createdAt: true,
      order: { select: { id: true, number: true } },
      seller: { select: { id: true, brandName: true, phone: true } },
      items: { select: { id: true, nameSnapshot: true, sku: true, quantity: true } },
    },
  });

  return apiOk({
    items: rows.map((r) => ({
      id: r.id,
      model: r.fulfillmentModel,
      status: r.status,
      deadlineAt: r.deadlineAt.toISOString(),
      packedAt: r.packedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      order: r.order,
      // Sotuvchisiz — platformaning o'z tovari.
      seller: r.seller,
      items: r.items.map((it) => ({
        id: it.id,
        name: it.nameSnapshot,
        sku: it.sku,
        quantity: it.quantity,
      })),
    })),
  });
}
