// Sellobay — Buyurtma fulfillment (status o'tishi) server logikasi.
// Faqat admin API route'idan chaqiriladi. inventory-server / loyalty-server pattern'i:
// funksiyalar `tx: Prisma.TransactionClient` qabul qiladi — chaqiruvchi $transaction'ni ochadi.

// O'tish qonuniyligi (qaysi statusga, qaysi to'lov holatida) — @ecom/core-domain
// `order-fulfillment` da; DELIVERED yon ta'sirlari (COD + soldCount) — @ecom/order-ops
// (kuryer ilovasi ham aynan shu funksiyani chaqiradi). Bu fayl faqat statusni yozadi.

import { type FulfillmentStatus } from '@ecom/core-domain';
import { settleDeliveredOrder } from '@ecom/order-ops';

import type { Prisma } from '@ecom/database';

export interface FulfillmentOrder {
  id: string;
  status: string; // joriy holat — atomik o'tish sharti uchun
  shippedAt: Date | null;
}

export interface FulfillmentResult {
  codSettled: boolean; // COD to'lovi shu o'tishda PAID qilindimi
  soldCountItems: number; // soldCount oshirilgan satrlar soni
}

/** Parallel PATCH holatni allaqachon o'zgartirgan bo'lsa tashlanadi — tx rollback qilinadi. */
export class ConcurrentTransitionError extends Error {
  constructor() {
    super('CONCURRENT_TRANSITION');
    this.name = 'ConcurrentTransitionError';
  }
}

/**
 * Status o'tishining DB yon ta'sirlarini bitta $transaction ichida qo'llaydi:
 *   • status + OrderStatusHistory
 *   • SHIPPED/OUT_FOR_DELIVERY → shippedAt (agar hali bo'lmasa)
 *   • DELIVERED → deliveredAt + `settleDeliveredOrder` (soldCount++, naqd buyurtmada
 *     COD to'lovi PAID + order.paidAt/paidTotal).
 * Transition qonuniyligi (canAdminTransition) chaqiruvchida tekshirilishi shart.
 */
export async function applyFulfillmentTransition(
  tx: Prisma.TransactionClient,
  order: FulfillmentOrder,
  next: FulfillmentStatus,
  opts: { changedBy?: string | null; comment?: string } = {},
): Promise<FulfillmentResult> {
  const now = new Date();

  // Skalyar maydonlar — ATOMIK shartli UPDATE bilan yoziladi (nested yozuvsiz).
  const scalar: Record<string, unknown> = { status: next };
  if ((next === 'SHIPPED' || next === 'OUT_FOR_DELIVERY') && !order.shippedAt) {
    scalar.shippedAt = now;
  }
  if (next === 'DELIVERED') scalar.deliveredAt = now;

  // ATOMIK holat o'tishi — faqat joriy (kutilgan) statusdan. Parallel/duplikat PATCH count===0
  // oladi → ConcurrentTransitionError → tx rollback (double soldCount / COD settle oldini oladi).
  const moved = await tx.order.updateMany({
    where: { id: order.id, status: order.status as FulfillmentStatus },
    data: scalar,
  });
  if (moved.count === 0) throw new ConcurrentTransitionError();

  await tx.orderStatusHistory.create({
    data: {
      orderId: order.id,
      status: next,
      comment: opts.comment ?? `Holat: ${next}`,
      changedBy: opts.changedBy ?? null,
    },
  });

  if (next !== 'DELIVERED') return { codSettled: false, soldCountItems: 0 };
  return settleDeliveredOrder(tx, order.id, now);
}
