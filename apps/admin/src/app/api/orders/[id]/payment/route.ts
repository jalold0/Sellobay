// PATCH /api/orders/[id]/payment — karta orqali qo'lda to'lovni admin tomonidan tekshirish.
//   action=verify → Payment PAID + buyurtma PAID (paidAt, paidTotal) — fulfillment davom etadi.
//     `receivedAmount` MAJBURIY: admin chekda (bank ilovasida) ko'rgan summani o'zi kiritadi va u
//     buyurtma summasiga aniq teng bo'lishi shart.
//   action=reject → Payment FAILED + buyurtma tarixiga izoh (status PENDING'da qoladi).
// Faqat ADMIN/SUPER_ADMIN. Faqat UZCARD + PENDING to'lovga ta'sir qiladi.

import { Prisma } from '@ecom/database';
import { grantOrderEarn } from '@ecom/order-ops';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { writeAudit } from '@/lib/audit';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  action: z.enum(['verify', 'reject']),
  comment: z.string().trim().max(300).optional(),
  // So'mda, satr ko'rinishida (pul `number`da uzatilmaydi). Faqat verify'da kerak.
  receivedAmount: z
    .string()
    .trim()
    .regex(/^\d{1,12}(\.\d{1,2})?$/, "Summa raqam bo'lishi kerak (masalan 1250000)")
    .optional(),
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
    return apiError(
      400,
      'VALIDATION',
      parsed.error.issues[0]?.message ?? "action 'verify' yoki 'reject' bo'lishi kerak",
    );
  }
  const { action, comment, receivedAmount } = parsed.data;

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
        select: { id: true, amount: true, rawPayload: true },
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
    // Kutilgan summa buyurtma summasi bilan sinxron bo'lishi kerak (buyurtma keyin o'zgargan bo'lsa —
    // avval to'lov yozuvi yangilanishi lozim).
    if (!payment.amount.equals(order.grandTotal)) {
      return apiError(
        409,
        'AMOUNT_MISMATCH',
        `To'lov summasi (${payment.amount.toString()}) buyurtma summasiga (${order.grandTotal.toString()}) mos emas`,
      );
    }
    // HAQIQIY tekshiruv: admin chekda ko'rgan summani o'zi kiritadi. Ilgari faqat yuqoridagi
    // solishtiruv bor edi — ikkalasini ham server o'zi yozgani uchun u hech narsani tekshirmasdi,
    // chekdagi summa esa faqat ko'z bilan solishtirilardi (audit K7).
    if (!receivedAmount) {
      return apiError(
        400,
        'RECEIVED_AMOUNT_REQUIRED',
        'Chekdagi summani kiriting — u buyurtma summasi bilan solishtiriladi',
      );
    }
    const received = new Prisma.Decimal(receivedAmount);
    if (!received.equals(order.grandTotal)) {
      const diff = received.sub(order.grandTotal);
      return apiError(
        409,
        'RECEIVED_AMOUNT_MISMATCH',
        `Chekdagi summa (${received.toString()}) buyurtma summasidan (${order.grandTotal.toString()}) ${
          diff.isNegative() ? `${diff.abs().toString()} so'm kam` : `${diff.toString()} so'm ko'p`
        } — to'lov tasdiqlanmadi. Mijoz bilan bog'laning yoki rad eting.`,
      );
    }
    // Kim, qachon va qancha deb tasdiqlagani — to'lov yozuvida (mijoz cheki ma'lumoti saqlanadi).
    const verifiedPayload = {
      ...(payment.rawPayload &&
      typeof payment.rawPayload === 'object' &&
      !Array.isArray(payment.rawPayload)
        ? (payment.rawPayload as Prisma.JsonObject)
        : {}),
      verification: {
        receivedAmount: received.toString(),
        verifiedBy: user.id,
        verifiedAt: now.toISOString(),
      },
    } satisfies Prisma.InputJsonValue;
    try {
      await prisma.$transaction(async (tx) => {
        // ATOMIK — faqat hali PENDING to'lov / kutilgan buyurtma holatida. Parallel verify+reject
        // yoki double-click'da ikkinchisi count===0 oladi → rollback (PAID+FAILED nomuvofiqligi yo'q).
        const pMoved = await tx.payment.updateMany({
          where: { id: payment.id, status: 'PENDING' },
          data: { status: 'PAID', paidAt: now, rawPayload: verifiedPayload },
        });
        if (pMoved.count === 0) throw new PaymentStateChangedError();

        const oMoved = await tx.order.updateMany({
          where: { id: order.id, status: order.status },
          // paidTotal — haqiqatda tushgan (chekdagi) summa
          data: { status: 'PAID', paidAt: order.paidAt ?? now, paidTotal: received },
        });
        if (oMoved.count === 0) throw new PaymentStateChangedError();

        await tx.order.update({
          where: { id: order.id },
          data: {
            statusHistory: {
              create: {
                status: 'PAID',
                comment: comment ?? `Karta to'lovi tasdiqlandi: chekda ${received.toString()} so'm`,
                changedBy: user.id,
              },
            },
          },
        });

        // Sello Coins earn — yaratishda kechiktirilgan edi (UZCARD). To'lov tasdiqlanganda
        // beriladi. Idempotent (re-verify/double-grant yo'q). Formula @ecom/core-domain'dan —
        // ilgari admin'da nusxasi turardi.
        if (order.userId) {
          await grantOrderEarn(tx, order.userId, order.grandTotal.toNumber(), order.number);
        }
        await writeAudit(
          {
            userId: user.id,
            action: 'payment.verify',
            resource: 'Payment',
            resourceId: payment.id,
            meta: {
              orderId: order.id,
              receivedAmount: received.toString(),
              comment: comment ?? null,
            },
          },
          tx,
        );
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
      await writeAudit(
        {
          userId: user.id,
          action: 'payment.reject',
          resource: 'Payment',
          resourceId: payment.id,
          meta: { orderId: order.id, comment: comment ?? null },
        },
        tx,
      );
    });
  } catch (e) {
    if (e instanceof PaymentStateChangedError) {
      return apiError(409, 'PAYMENT_ALREADY_PROCESSED', 'To`lov allaqachon qayta ishlangan');
    }
    throw e;
  }
  return apiOk({ orderId: order.id, orderStatus: order.status, paymentStatus: 'FAILED' });
}
