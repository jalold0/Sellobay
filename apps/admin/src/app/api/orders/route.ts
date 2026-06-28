// GET /api/orders — barcha buyurtmalar (admin). Faqat ADMIN/SUPER_ADMIN.

import { NextRequest } from 'next/server';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user) return { err: apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan') };
  const allowed = ['ADMIN', 'SUPER_ADMIN'];
  if (!user.roles?.some((r) => allowed.includes(r))) {
    return { err: apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)") };
  }
  return { err: null };
}

export async function GET(req: NextRequest) {
  const { err } = await assertAdmin();
  if (err) return err;

  const status = req.nextUrl.searchParams.get('status');

  const orders = await prisma.order.findMany({
    where: status ? { status: status as never } : undefined,
    orderBy: { placedAt: 'desc' },
    take: 200,
    select: {
      id: true,
      number: true,
      status: true,
      grandTotal: true,
      placedAt: true,
      paidAt: true,
      guestPhone: true,
      guestEmail: true,
      deliveryMethod: true,
      user: { select: { firstName: true, lastName: true, phone: true, email: true } },
      shippingAddress: { select: { city: true } },
      _count: { select: { items: true } },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { provider: true, status: true },
      },
    },
  });

  const items = orders.map((o) => {
    const customerName =
      [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ').trim() ||
      o.user?.email ||
      o.guestEmail ||
      'Mehmon';
    const payment = o.payments[0];
    return {
      id: o.id,
      number: o.number,
      customerName,
      customerPhone: o.user?.phone ?? o.guestPhone ?? '',
      status: o.status,
      paymentStatus: payment?.status ?? (o.paidAt ? 'PAID' : 'PENDING'),
      paymentProvider: payment?.provider ?? '—',
      grandTotal: Number(o.grandTotal),
      itemCount: o._count.items,
      deliveryMethod: o.deliveryMethod,
      city: o.shippingAddress?.city ?? '',
      placedAt: o.placedAt.toISOString(),
    };
  });

  return apiOk({ items });
}
