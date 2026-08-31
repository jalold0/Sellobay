// GET /api/orders/payment-review — karta orqali qo'lda to'lov qilingan, admin tasdiqini
// kutayotgan buyurtmalar (Payment: provider=UZCARD, status=PENDING, chek yuklangan).
// Faqat ADMIN/SUPER_ADMIN.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { manualCardPayload, receiptSrc } from '@/lib/receipt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  if (!user.roles?.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r))) {
    return apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)");
  }

  const payments = await prisma.payment.findMany({
    where: { provider: 'UZCARD', status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      amount: true,
      rawPayload: true,
      createdAt: true,
      order: {
        select: {
          id: true,
          number: true,
          status: true,
          grandTotal: true,
          placedAt: true,
          guestPhone: true,
          user: { select: { firstName: true, lastName: true, phone: true, email: true } },
          shippingAddress: { select: { recipientName: true, city: true } },
          _count: { select: { items: true } },
        },
      },
    },
  });

  const items = payments
    .map((p) => {
      const payload = manualCardPayload(p.rawPayload);
      const receipt = receiptSrc(payload);
      if (!payload || !receipt) return null; // faqat chekli karta to'lovlari
      const o = p.order;
      const customerName =
        [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ').trim() ||
        o.shippingAddress?.recipientName ||
        o.user?.email ||
        'Mehmon';
      return {
        paymentId: p.id,
        orderId: o.id,
        orderNumber: o.number,
        orderStatus: o.status,
        amount: Number(p.amount),
        grandTotal: Number(o.grandTotal),
        customerName,
        customerPhone: o.user?.phone ?? o.guestPhone ?? '',
        city: o.shippingAddress?.city ?? '',
        itemCount: o._count.items,
        note: payload.note ?? null,
        receipt,
        placedAt: o.placedAt.toISOString(),
        createdAt: p.createdAt.toISOString(),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return apiOk({ items });
}
