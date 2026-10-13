// GET /api/orders/[id] — buyurtma to'liq tafsiloti (admin). Faqat ADMIN/SUPER_ADMIN.
// Detal sahifasi shu endpoint'dan real ma'lumot oladi (mock EMAS).

import {
  adminFulfillmentTargets,
  canAdminCancel,
  carrierEventsFor,
  orderPaymentState,
} from '@ecom/core-domain';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { adminProductImage } from '@/lib/product-image';
import { manualCardPayload, receiptSrc } from '@/lib/receipt';
import { remainingFor } from '@/lib/refund-server';

import type { Prisma } from '@ecom/database';
import type { NextRequest } from 'next/server';

function carrierView(
  d:
    | {
        carrier: string | null;
        trackingNumber: string | null;
        carrierPayload: Prisma.JsonValue;
        carrierStatus: string | null;
        carrierUpdatedAt: Date | null;
        failureReason: string | null;
      }
    | undefined,
) {
  if (!d?.carrier) return null;
  const payload = d.carrierPayload as { companyName?: unknown } | null;
  return {
    provider: d.carrier,
    company: typeof payload?.companyName === 'string' ? payload.companyName : d.carrier,
    trackingNumber: d.trackingNumber,
    status: d.carrierStatus,
    updatedAt: d.carrierUpdatedAt?.toISOString() ?? null,
    failureReason: d.failureReason,
  };
}

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
      paidTotal: true,
      refundedTotal: true,
      placedAt: true,
      paidAt: true,
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
            select: {
              slug: true,
              images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } },
            },
          },
        },
      },
      statusHistory: {
        orderBy: { changedAt: 'asc' },
        select: { status: true, comment: true, changedAt: true },
      },
      // Sotuvchi jo'natmalari (ADR 0015) — «Qadoqlandi»dan keyin faqat hammasi omborda bo'lsa.
      // Oxirgi masofa (ADR 0015): 3PL yoki o'z kuryerimiz.
      deliveries: {
        where: { kind: 'OUTBOUND' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          status: true,
          courierId: true,
          carrier: true,
          trackingNumber: true,
          carrierPayload: true,
          carrierStatus: true,
          carrierUpdatedAt: true,
          failureReason: true,
        },
      },
      sellerShipments: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          fulfillmentModel: true,
          status: true,
          deadlineAt: true,
          seller: { select: { brandName: true } },
          _count: { select: { items: true } },
        },
      },
      // Hammasi (oxirgisi ko'rsatish uchun, barchasi — to'lov holatini aniqlash uchun)
      payments: {
        orderBy: { createdAt: 'desc' },
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
  const manual = manualCardPayload(payment?.rawPayload);
  const isManualCard = payment?.provider === 'UZCARD' && manual !== null;

  return apiOk({
    id: o.id,
    number: o.number,
    status: o.status,
    customerName,
    customerPhone: o.user?.phone ?? o.guestPhone ?? '',
    paymentStatus: payment?.status ?? 'PENDING',
    paymentProvider: payment?.provider ?? '—',
    // Status menyusi shu ro'yxatdan quriladi — server PATCH'da aynan shu qoidani tekshiradi.
    allowedNextStatuses: adminFulfillmentTargets(o.status, orderPaymentState(o)),
    // Bekor qilish tugmasi — server POST /cancel da xuddi shu qoidani tekshiradi.
    canCancel: canAdminCancel(o.status),
    // Pul qaytarish: qaytarilgani va hali qaytarilishi kerak bo'lgani (o'nlik satr).
    refund: {
      refundedTotal: o.refundedTotal.toFixed(2),
      remaining: remainingFor(o),
    },
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
      imageUrl: adminProductImage(it.product?.images[0]?.url, it.product?.slug ?? ''),
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      totalPrice: Number(it.totalPrice),
    })),
    statusHistory: o.statusHistory.map((h) => ({
      status: h.status,
      changedAt: h.changedAt.toISOString(),
      comment: h.comment ?? undefined,
    })),
    carrier: carrierView(o.deliveries[0]),
    // 3PL tugmalari — o'z kuryerimiz olgan yetkazishga emas.
    carrierEvents: o.deliveries[0]?.courierId
      ? []
      : carrierEventsFor(o.status, Boolean(o.deliveries[0]?.carrier)),
    shipments: o.sellerShipments.map((s) => ({
      id: s.id,
      model: s.fulfillmentModel,
      status: s.status,
      deadlineAt: s.deadlineAt.toISOString(),
      sellerName: s.seller?.brandName ?? null,
      itemCount: s._count.items,
    })),
    // Karta orqali qo'lda to'lov — chek + izoh (verify/reject uchun)
    manualCard: isManualCard
      ? {
          pending: payment.status === 'PENDING',
          receipt: receiptSrc(manual) ?? '',
          note: manual?.note ?? null,
        }
      : null,
  });
}
