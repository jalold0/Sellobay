// Sotuvchi paneli — joriy sotuvchining buyurtmalari ro'yxati.
// Faqat shu sotuvchining mahsulotlari bo'lgan Order'larni qaytaradi.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const seller = await prisma.seller.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true, status: true },
  });
  if (!seller) return apiOk({ items: [] });

  // Sotuvchining order item'lariga ega Order'larni topamiz
  const orders = await prisma.order.findMany({
    where: {
      items: { some: { sellerId: seller.id } },
    },
    orderBy: { placedAt: 'desc' },
    take: 100,
    select: {
      id: true,
      number: true,
      status: true,
      grandTotal: true,
      placedAt: true,
      deliveryMethod: true,
      user: {
        select: { firstName: true, lastName: true, phone: true },
      },
      guestPhone: true,
      shippingAddress: {
        select: { city: true, street: true, recipientName: true },
      },
      items: {
        where: { sellerId: seller.id },
        select: {
          id: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          nameSnapshot: true,
          sku: true,
        },
      },
    },
  });

  return apiOk({
    items: orders.map((o) => {
      const sellerSubtotal = o.items.reduce((s, it) => s + Number(it.totalPrice), 0);
      const customerName =
        [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ').trim() ||
        o.shippingAddress?.recipientName ||
        'Mehmon';
      const customerPhone = o.user?.phone ?? o.guestPhone ?? null;
      return {
        id: o.id,
        number: o.number,
        status: o.status,
        placedAt: o.placedAt.toISOString(),
        deliveryMethod: o.deliveryMethod,
        customer: { name: customerName, phone: customerPhone },
        address: o.shippingAddress
          ? `${o.shippingAddress.city}, ${o.shippingAddress.street}`
          : null,
        sellerSubtotal: sellerSubtotal.toString(),
        itemCount: o.items.length,
        items: o.items.map((it) => ({
          id: it.id,
          sku: it.sku,
          name: it.nameSnapshot,
          quantity: it.quantity,
          unitPrice: it.unitPrice.toString(),
          totalPrice: it.totalPrice.toString(),
        })),
      };
    }),
  });
}
