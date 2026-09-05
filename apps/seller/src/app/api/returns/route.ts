// GET /api/returns — sotuvchining qaytarilgan buyurtmalari.
//
// DIQQAT — oqim haqida: Sellobay'da qaytarishni MIJOZ boshlaydi va u DARHOL
// amalga oshadi (apps/web `/api/orders/[id]/return`): buyurtma RETURNED
// bo'ladi, zaxira omborga qaytariladi va Sello Coins qaytariladi. Keyin
// operator pulni qaytaradi (RETURNED → REFUNDED).
//
// Ya'ni sotuvchi tasdig'i oqimda YO'Q. Sotuvchi sahifasi ilgari
// REQUESTED → APPROVED/REJECTED bosqichlarini ko'rsatardi va "Tasdiqlash"
// tugmasi bor edi — bu tugma faqat toast chiqarardi, chunki bunday bosqich
// bazada umuman mavjud emas (Return modeli yo'q). Batafsil: docs/adr/0008.
//
// Shu sababli bu endpoint faqat O'QISH uchun: sotuvchi nima qaytarilganini
// va pul qaytarilgan-qaytarilmaganini ko'radi.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Qaytarish bilan bog'liq buyurtma holatlari. */
const RETURN_STATUSES = ['RETURNED', 'REFUNDED'] as const;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const seller = await prisma.seller.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  if (!seller) return apiOk({ items: [] });

  const orders = await prisma.order.findMany({
    where: {
      status: { in: [...RETURN_STATUSES] },
      items: { some: { sellerId: seller.id } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      number: true,
      status: true,
      placedAt: true,
      cancelledAt: true,
      cancellationReason: true,
      user: { select: { firstName: true, lastName: true } },
      shippingAddress: { select: { recipientName: true } },
      guestPhone: true,
      // Faqat SHU sotuvchining satrlari — boshqa sotuvchining tovari
      // ko'rinmasligi kerak.
      items: {
        where: { sellerId: seller.id },
        select: {
          id: true,
          sku: true,
          nameSnapshot: true,
          quantity: true,
          totalPrice: true,
        },
      },
      statusHistory: {
        where: { status: { in: [...RETURN_STATUSES] } },
        orderBy: { changedAt: 'desc' },
        take: 1,
        select: { changedAt: true, comment: true },
      },
    },
  });

  return apiOk({
    items: orders.map((o) => {
      const event = o.statusHistory[0];
      return {
        id: o.id,
        number: o.number,
        status: o.status,
        placedAt: o.placedAt.toISOString(),
        returnedAt: (event?.changedAt ?? o.cancelledAt)?.toISOString() ?? null,
        reason: event?.comment ?? o.cancellationReason ?? null,
        customerName:
          [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ').trim() ||
          o.shippingAddress?.recipientName ||
          'Mehmon',
        /** Shu sotuvchining qaytarilgan tovarlari summasi. */
        sellerAmount: o.items.reduce((s, it) => s + Number(it.totalPrice), 0),
        items: o.items.map((it) => ({
          id: it.id,
          sku: it.sku,
          name: it.nameSnapshot,
          quantity: it.quantity,
          totalPrice: Number(it.totalPrice),
        })),
      };
    }),
  });
}
