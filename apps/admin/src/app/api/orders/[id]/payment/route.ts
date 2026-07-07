// PATCH /api/orders/[id]/payment — karta orqali qo'lda to'lovni admin tomonidan tekshirish.
//   action=verify → Payment PAID + buyurtma PAID (paidAt, paidTotal) — fulfillment davom etadi.
//   action=reject → Payment FAILED + buyurtma tarixiga izoh (status PENDING'da qoladi).
// Faqat ADMIN/SUPER_ADMIN. Faqat UZCARD + PENDING to'lovga ta'sir qiladi.

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  action: z.enum(['verify', 'reject']),
  comment: z.string().trim().max(300).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  if (!user.roles?.some((r) => ['ADMIN', 'SUPER_ADMIN'].includes(r))) {
    return apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)");
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', "action 'verify' yoki 'reject' bo'lishi kerak");
  }
  const { action, comment } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      number: true,
      status: true,
      grandTotal: true,
      paidAt: true,
      payments: {
        where: { provider: 'UZCARD', status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  });
  if (!order) return apiError(404, 'NOT_FOUND', 'Buyurtma topilmadi');

  const payment = order.payments[0];
  if (!payment) {
    return apiError(409, 'NO_PENDING_PAYMENT', 'Bu buyurtmada tekshiriladigan karta to`lovi yo`q');
  }

  const now = new Date();

  if (action === 'verify') {
    // Buyurtma to'lovdan oldingi holatda bo'lishi kerak (PENDING/CONFIRMED).
    if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
      return apiError(
        409,
        'INVALID_STATE',
        `«${order.status}» holatidagi buyurtma to'lovini tasdiqlab bo'lmaydi`,
      );
    }
    await prisma.$transaction([
      prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', paidAt: now },
      }),
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paidAt: order.paidAt ?? now,
          paidTotal: order.grandTotal,
          statusHistory: {
            create: {
              status: 'PAID',
              comment: comment ?? 'Karta to`lovi admin tomonidan tasdiqlandi',
              changedBy: user.id,
            },
          },
        },
      }),
    ]);
    return apiOk({ orderId: order.id, orderStatus: 'PAID', paymentStatus: 'PAID' });
  }

  // reject — to'lov rad etildi, buyurtma PENDING'da qoladi (mijoz qayta yuklashi mumkin)
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'FAILED', failedAt: now },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: {
        statusHistory: {
          create: {
            status: order.status,
            comment: comment ? `To'lov rad etildi: ${comment}` : 'Karta to`lovi cheki rad etildi',
            changedBy: user.id,
          },
        },
      },
    }),
  ]);
  return apiOk({ orderId: order.id, orderStatus: order.status, paymentStatus: 'FAILED' });
}
