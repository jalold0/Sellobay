// Buyurtma fulfillment (status o'tishi). Admin holat menyusi ham, 3PL holatlari ham (ADR 0015)
// shu yerdan o'tadi. Funksiyalar `tx: Prisma.TransactionClient` oladi — chaqiruvchi
// $transaction'ni ochadi.

// O'tish qonuniyligi (qaysi statusga, qaysi to'lov holatida) — @ecom/core-domain
// `order-fulfillment` da; DELIVERED yon ta'sirlari (COD, soldCount, sotuvchi daftari) —
// `settleDeliveredOrder` (kuryer ilovasi ham aynan shu funksiyani chaqiradi).

import { FULFILLMENT_FLOW, type FulfillmentStatus } from '@ecom/core-domain';

import { settleDeliveredOrder } from './delivered';
import { completeWarehouseShipments, openSellerShipmentCount } from './seller-shipments';

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

/** Sotuvchining (FBS) tovari hali omborga kelmagan — buyurtmani jo'natib bo'lmaydi. */
export class OpenShipmentsError extends Error {
  constructor(readonly count: number) {
    super('OPEN_SELLER_SHIPMENTS');
    this.name = 'OpenShipmentsError';
  }
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

  // PACKED va undan keyin — hamma tovar omborda bo'lishi shart (ADR 0015). Omborning o'z (FBO)
  // jo'natmalari shu o'tishda «yig'ildi» deb belgilanadi; sotuvchining FBS tovari esa sotuvchi
  // qadoqlab olib kelgach «Ombor qabuli»da qabul qilinadi.
  if (FULFILLMENT_FLOW.indexOf(next) >= FULFILLMENT_FLOW.indexOf('PACKED')) {
    await completeWarehouseShipments(tx, order.id, opts.changedBy ?? null, now);
    const open = await openSellerShipmentCount(tx, order.id);
    if (open > 0) throw new OpenShipmentsError(open);
  }

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
  // Global buyurtma — operator zayavkasi ham «mijoz oldi» (bitta haqiqat, ADR 0015).
  await tx.globalFulfillment.updateMany({
    where: { orderId: order.id, status: { notIn: ['DELIVERED', 'CANCELLED', 'REFUNDED'] } },
    data: { status: 'DELIVERED', deliveredAt: now },
  });
  return settleDeliveredOrder(tx, order.id, now);
}
