// Sotuvchi paneli — joriy sotuvchining buyurtmalari va jo'natmalari (ADR 0015).
//
// Har buyurtmada sotuvchiga tegishli qism — jo'natma (`SellerShipment`): FBS'da sotuvchi uni
// qabul qilib, qadoqlab, muddatgacha omborga olib keladi; FBO'da ombor o'zi yig'adi.
//
// Mijozning telefoni va manzili sotuvchiga BERILMAYDI: tovar omborimiz orqali bitta yetkazish
// bo'lib ketadi, sotuvchi mijoz bilan to'g'ridan-to'g'ri ishlamaydi (shaxsiy ma'lumot — kerak
// bo'lgandagina).

import { Prisma } from '@ecom/database';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { requireSeller } from '@/lib/seller-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const { seller, err } = await requireSeller(user.id, 'read');
  if (err) return apiOk({ items: [] });

  const orders = await prisma.order.findMany({
    where: { items: { some: { sellerId: seller.id } } },
    orderBy: { placedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      number: true,
      status: true,
      placedAt: true,
      items: {
        where: { sellerId: seller.id },
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          nameSnapshot: true,
          sku: true,
          sellerShipmentId: true,
        },
      },
      sellerShipments: {
        where: { sellerId: seller.id },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          fulfillmentModel: true,
          status: true,
          deadlineAt: true,
          acceptedAt: true,
          packedAt: true,
          handedOverAt: true,
        },
      },
    },
  });

  return apiOk({
    items: orders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      placedAt: o.placedAt.toISOString(),
      sellerSubtotal: o.items
        .reduce((s, it) => s.add(it.totalPrice), new Prisma.Decimal(0))
        .toString(),
      items: o.items.map((it) => ({
        id: it.id,
        sku: it.sku,
        name: it.nameSnapshot,
        quantity: it.quantity,
        unitPrice: it.unitPrice.toString(),
        totalPrice: it.totalPrice.toString(),
        shipmentId: it.sellerShipmentId,
      })),
      shipments: o.sellerShipments.map((s) => ({
        id: s.id,
        model: s.fulfillmentModel,
        status: s.status,
        deadlineAt: s.deadlineAt.toISOString(),
        acceptedAt: s.acceptedAt?.toISOString() ?? null,
        packedAt: s.packedAt?.toISOString() ?? null,
        handedOverAt: s.handedOverAt?.toISOString() ?? null,
      })),
    })),
  });
}
