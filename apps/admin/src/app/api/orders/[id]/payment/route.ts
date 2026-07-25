// PATCH /api/orders/[id]/payment — karta orqali qo'lda to'lovni admin tomonidan tekshirish.
//   action=verify → Payment PAID + buyurtma PAID (paidAt, paidTotal) — fulfillment davom etadi.
//   action=reject → Payment FAILED + buyurtma tarixiga izoh (status PENDING'da qoladi).
// Faqat ADMIN/SUPER_ADMIN. Faqat UZCARD + PENDING to'lovga ta'sir qiladi.

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

// Sello Coins earn iqtisodi — manba: apps/web/src/lib/loyalty.ts (har 1000 so'mdan 1 coin).
// Cross-app (admin↔web) chegarasi sabab shu yerda takrorlanadi; iqtisod o'zgarsa ikkalasi yangilanadi.
const COIN_PER_SOM = 1 / 1000;
function coinsForOrder(totalSom: number): number {
  return Math.max(0, Math.floor(totalSom * COIN_PER_SOM));
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  action: z.enum(['verify', 'reject']),
  comment: z.string().trim().max(300).optional(),
});

/** Parallel admin amali (verify+reject) allaqachon holatni o'zgartirgan bo'lsa — tx rollback. */
class PaymentStateChangedError extends Error {
  constructor() {
    super('PAYMENT_STATE_CHANGED');
    this.name = 'PaymentStateChangedError';
  }
}

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
      userId: true,
      payments: {
        where: { provider: 'UZCARD', status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true, amount: true },
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
    // To'lov summasi buyurtma summasiga teng bo'lishi shart — kam to'lovni "to'liq to'langan"
    // deb belgilamaymiz. (Payment.amount buyurtma tahrirlansa ham grandTotal bilan sinxronlanadi.)
    if (!payment.amount.equals(order.grandTotal)) {
      return apiError(
        409,
        'AMOUNT_MISMATCH',
        `To'lov summasi (${payment.amount.toString()}) buyurtma summasiga (${order.grandTotal.toString()}) mos emas`,
      );
    }
    try {
      await prisma.$transaction(async (tx) => {
        // ATOMIK — faqat hali PENDING to'lov / kutilgan buyurtma holatida. Parallel verify+reject
        // yoki double-click'da ikkinchisi count===0 oladi → rollback (PAID+FAILED nomuvofiqligi yo'q).
        const pMoved = await tx.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: { status: 'PAID', paidAt: now },
        });
        if (pMoved.count === 0) throw new PaymentStateChangedError();

        const oMoved = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          data: { status: 'PAID', paidAt: order.paidAt ?? now, paidTotal: order.grandTotal },
        });
        if (oMoved.count === 0) throw new PaymentStateChangedError();

        await tx.order.update({
          where: { id: order.id },
          data: {
            statusHistory: {
              create: {
                status: 'PAID',
                comment: comment ?? 'Karta to`lovi admin tomonidan tasdiqlandi',
                changedBy: user.id,
              },
            },
          },
        });

        // Sello Coins earn — yaratishda kechiktirilgan edi (UZCARD). To'lov tasdiqlanganda
        // beriladi. Idempotent: ORDER_EARN allaqachon bo'lsa qayta bermaydi (re-verify/double-grant yo'q).
        if (order.userId) {
          const already = await tx.loyaltyTransaction.count({
            where: { userId: order.userId, reference: order.number, reason: 'ORDER_EARN' },
          });
          if (already === 0) {
            const earned = coinsForOrder(order.grandTotal.toNumber());
            if (earned > 0) {
              await tx.loyaltyTransaction.create({
                data: {
                  userId: order.userId,
                  points: earned,
                  reason: 'ORDER_EARN',
                  reference: order.number,
                },
              });
              await tx.user.update({
                where: { id: order.userId },
                data: { loyaltyPoints: { increment: earned } },
              });
            }
          }
        }
      });
    } catch (e) {
      if (e instanceof PaymentStateChangedError) {
        return apiError(409, 'PAYMENT_ALREADY_PROCESSED', 'To`lov allaqachon qayta ishlangan');
      }
      throw e;
    }
    return apiOk({ orderId: order.id, orderStatus: 'PAID', paymentStatus: 'PAID' });
  }

  // reject — to'lov rad etildi, buyurtma PENDING'da qoladi (mijoz qayta yuklashi mumkin)
  try {
    await prisma.$transaction(async (tx) => {
      const pMoved = await tx.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: 'FAILED', failedAt: now },
      });
      if (pMoved.count === 0) throw new PaymentStateChangedError();

      await tx.order.update({
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
      });
    });
  } catch (e) {
    if (e instanceof PaymentStateChangedError) {
      return apiError(409, 'PAYMENT_ALREADY_PROCESSED', 'To`lov allaqachon qayta ishlangan');
    }
    throw e;
  }
  return apiOk({ orderId: order.id, orderStatus: order.status, paymentStatus: 'FAILED' });
}
