// Pulni qaytarishni qayd etish (audit K5). Qoida — @ecom/core-domain `refund`.
//
// Pul o'zi qo'lda qaytariladi (Click/Payme kabineti, naqd yoki kartaga o'tkazma) — bu yerda
// faqat summasi, usuli va kim qaytargani yoziladi. To'liq qaytsa buyurtma REFUNDED bo'ladi.

import { ApiDomainError } from '@ecom/api-contract';
import {
  decideRefund,
  REFUNDABLE_ORDER_STATUSES,
  refundRemaining,
  type RefundableOrder,
} from '@ecom/core-domain';

import { writeAudit } from '@/lib/audit';
import { prisma } from '@/lib/db';

export class RefundError extends ApiDomainError {}

export const REFUND_METHODS = {
  GATEWAY: 'Click/Payme kabineti orqali',
  CARD_TRANSFER: 'Kartaga o‘tkazma',
  CASH: 'Naqd',
} as const;
export type RefundMethod = keyof typeof REFUND_METHODS;

const REFUND_SELECT = {
  id: true,
  number: true,
  status: true,
  paidAt: true,
  paidTotal: true,
  grandTotal: true,
  refundedTotal: true,
} as const;

function toRefundable(o: {
  status: string;
  paidAt: Date | null;
  paidTotal: { toFixed(n: number): string };
  grandTotal: { toFixed(n: number): string };
  refundedTotal: { toFixed(n: number): string };
}): RefundableOrder {
  return {
    status: o.status,
    paidAt: o.paidAt,
    paidTotal: o.paidTotal.toFixed(2),
    grandTotal: o.grandTotal.toFixed(2),
    refundedTotal: o.refundedTotal.toFixed(2),
  };
}

export function remainingFor(o: Parameters<typeof toRefundable>[0]): string {
  return refundRemaining(toRefundable(o));
}

export async function recordRefund(input: {
  orderId: string;
  adminUserId: string;
  amount: string;
  method: RefundMethod;
  reference?: string;
  note?: string;
}) {
  const lockKey = `refund:${input.orderId}`;
  const result = await prisma.$transaction(async (tx) => {
    // Ikki admin bir vaqtda bossa summa ikki marta qo'shilmasin.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
    const order = await tx.order.findUnique({
      where: { id: input.orderId },
      select: REFUND_SELECT,
    });
    if (!order) throw new RefundError(404, 'NOT_FOUND', 'Buyurtma topilmadi');

    const decision = decideRefund(toRefundable(order), input.amount);
    if (!decision.ok) {
      const message =
        decision.code === 'NOT_REFUNDABLE'
          ? 'Bu buyurtmada qaytariladigan pul yo‘q (to‘lanmagan, faol yoki allaqachon qaytarilgan)'
          : decision.code === 'INVALID_AMOUNT'
            ? 'Summani to‘g‘ri kiriting'
            : `Summa qoldiqdan katta — ko‘pi bilan ${decision.remaining} so‘m`;
      throw new RefundError(409, decision.code, message);
    }

    const now = new Date();
    const methodLabel = REFUND_METHODS[input.method];
    await tx.order.update({
      where: { id: order.id },
      data: {
        refundedTotal: decision.newRefundedTotal,
        ...(decision.fullyRefunded ? { status: 'REFUNDED' } : {}),
      },
    });
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: decision.fullyRefunded ? 'REFUNDED' : order.status,
        changedBy: input.adminUserId,
        comment: `${decision.fullyRefunded ? 'Pul to‘liq qaytarildi' : 'Pul qisman qaytarildi'}: ${input.amount} so‘m (${methodLabel})${input.note ? `. ${input.note}` : ''}`,
      },
    });
    await tx.payment.updateMany({
      where: { orderId: order.id, status: { in: ['PAID', 'PARTIALLY_REFUNDED'] } },
      data: {
        status: decision.fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        refundedAt: now,
      },
    });
    await writeAudit(
      {
        userId: input.adminUserId,
        action: 'order.refund',
        resource: 'Order',
        resourceId: order.id,
        meta: {
          amount: input.amount,
          method: input.method,
          reference: input.reference ?? null,
          note: input.note ?? null,
          refundedTotal: decision.newRefundedTotal,
          fully: decision.fullyRefunded,
        },
      },
      tx,
    );
    return { order, decision };
  });

  return {
    id: result.order.id,
    number: result.order.number,
    refundedTotal: result.decision.newRefundedTotal,
    fullyRefunded: result.decision.fullyRefunded,
    status: result.decision.fullyRefunded ? 'REFUNDED' : result.order.status,
  };
}

/** Pul qaytarilishi kutilayotgan buyurtmalar — admin navbati. */
export async function listPendingRefunds(limit = 100) {
  const rows = await prisma.order.findMany({
    where: { status: { in: [...REFUNDABLE_ORDER_STATUSES] }, paidAt: { not: null } },
    orderBy: { updatedAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 200),
    select: {
      ...REFUND_SELECT,
      updatedAt: true,
      user: { select: { firstName: true, lastName: true, phone: true } },
      guestPhone: true,
      payments: { select: { provider: true, status: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  return rows
    .map((o) => ({ o, remaining: remainingFor(o) }))
    .filter(({ remaining }) => remaining !== '0.00')
    .map(({ o, remaining }) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      remaining,
      refundedTotal: o.refundedTotal.toFixed(2),
      provider: o.payments.find((p) => p.status !== 'CANCELLED')?.provider ?? null,
      customerName: [o.user?.firstName, o.user?.lastName].filter(Boolean).join(' ') || null,
      customerPhone: o.user?.phone ?? o.guestPhone ?? null,
      updatedAt: o.updatedAt.toISOString(),
    }));
}
