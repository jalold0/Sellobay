// GET /api/orders/[id] — buyurtma to'liq tafsiloti (admin). Faqat ADMIN/SUPER_ADMIN.
// Detal sahifasi shu endpoint'dan real ma'lumot oladi (mock EMAS).

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  if (!user.roles?.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r))) {
    return apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)");
  }

  const o = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      number: true,
      status: true,
      subtotal: true,
      shippingTotal: true,
      discountTotal: true,
      grandTotal: true,
      placedAt: true,
      deliveryMethod: true,
      notes: true,
      guestPhone: true,
      user: { select: { firstName: true, lastName: true, phone: true, email: true } },
      shippingAddress: {
        select: {
          recipientName: true,
          phone: true,
          region: true,
          city: true,
          street: true,
          building: true,
          apartment: true,
          landmark: true,
        },
      },
      items: {
        select: {
          id: true,
          nameSnapshot: true,
          sku: true,
          quantity: true,
          unitPrice: true,
          totalPrice: true,
          product: {
            select: { images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } } },
          },
        },
      },
      statusHistory: {
        orderBy: { changedAt: 'asc' },
        select: { status: true, comment: true, changedAt: true },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, provider: true, status: true, rawPayload: true },
      },
    },
  });
  if (!o) return apiError(404, 'NOT_FOUND', 'Buyurtma topilmadi');

  const customerName =
    [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ').trim() ||
    o.shippingAddress?.recipientName ||
    o.user?.email ||
    'Mehmon';
  const payment = o.payments[0];
  const raw = (payment?.rawPayload ?? null) as {
    kind?: string;
    receipt?: string;
    note?: string | null;
  } | null;
  const isManualCard = payment?.provider === 'UZCARD' && raw?.kind === 'MANUAL_CARD';

  return apiOk({
    id: o.id,
    number: o.number,
    status: o.status,
    customerName,
    customerPhone: o.user?.phone ?? o.guestPhone ?? '',
    paymentStatus: payment?.status ?? 'PENDING',
    paymentProvider: payment?.provider ?? '—',
    subtotal: Number(o.subtotal),
    shippingTotal: Number(o.shippingTotal),
    discountTotal: Number(o.discountTotal),
    grandTotal: Number(o.grandTotal),
    placedAt: o.placedAt.toISOString(),
    deliveryMethod: o.deliveryMethod,
    city: o.shippingAddress?.city ?? '',
    notes: o.notes ?? undefined,
    shippingAddress: o.shippingAddress
      ? {
          recipientName: o.shippingAddress.recipientName,
          phone: o.shippingAddress.phone,
          region: o.shippingAddress.region,
          city: o.shippingAddress.city,
          street: [
            o.shippingAddress.street,
            o.shippingAddress.building,
            o.shippingAddress.apartment,
          ]
            .filter(Boolean)
            .join(', '),
          landmark: o.shippingAddress.landmark ?? undefined,
        }
      : null,
    items: o.items.map((it) => ({
      id: it.id,
      productName: it.nameSnapshot,
      sku: it.sku,
      imageUrl: it.product?.images[0]?.url ?? '',
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      totalPrice: Number(it.totalPrice),
    })),
    statusHistory: o.statusHistory.map((h) => ({
      status: h.status,
      changedAt: h.changedAt.toISOString(),
      comment: h.comment ?? undefined,
    })),
    // Karta orqali qo'lda to'lov — chek + izoh (verify/reject uchun)
    manualCard: isManualCard
      ? {
          pending: payment.status === 'PENDING',
          receipt: raw?.receipt ?? '',
          note: raw?.note ?? null,
        }
      : null,
  });
}
