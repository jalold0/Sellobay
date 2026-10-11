// Sellobay — Buyurtma fulfillment (status o'tishi) server logikasi.
// Faqat admin API route'idan chaqiriladi. inventory-server / loyalty-server pattern'i:
// funksiyalar `tx: Prisma.TransactionClient` qabul qiladi — chaqiruvchi $transaction'ni ochadi.

// O'tish qonuniyligi (qaysi statusga, qaysi to'lov holatida) — @ecom/core-domain
// `order-fulfillment` da; bu fayl faqat DB yon ta'sirlarini qo'llaydi.

import {
  COD_PROVIDER,
  settlesCodPayment,
  type FulfillmentStatus,
  type OrderPaymentState,
} from '@ecom/core-domain';

import type { Prisma } from '@ecom/database';

export interface FulfillmentOrder {
  id: string;
  status: string; // joriy holat — atomik o'tish sharti uchun
  grandTotal: Prisma.Decimal;
  paidAt: Date | null;
  shippedAt: Date | null;
  items: { productId: string; quantity: number }[];
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
 *   • DELIVERED → deliveredAt + soldCount++ (yetkazilgan = sotilgan) va naqd (COD) buyurtmada
 *     COD to'lovi PAID + order.paidAt/paidTotal.
 * Transition qonuniyligi (canAdminTransition) chaqiruvchida tekshirilishi shart.
 */
export async function applyFulfillmentTransition(
  tx: Prisma.TransactionClient,
  order: FulfillmentOrder,
  next: FulfillmentStatus,
  payment: OrderPaymentState,
  opts: { changedBy?: string | null; comment?: string } = {},
): Promise<FulfillmentResult> {
  const now = new Date();
  // Faqat naqd buyurtma yetkazilganda "pul olindi" deb yoziladi. Ilgari `!order.paidAt`
  // edi — to'lanmagan Click/Payme/UZCARD buyurtmasi ham DELIVERED'da PAID bo'lib qolardi.
  const codSettled = settlesCodPayment(next, payment);

  // Skalyar maydonlar — ATOMIK shartli UPDATE bilan yoziladi (nested yozuvsiz).
  const scalar: Record<string, unknown> = { status: next };
  if ((next === 'SHIPPED' || next === 'OUT_FOR_DELIVERY') && !order.shippedAt) {
    scalar.shippedAt = now;
  }
  if (next === 'DELIVERED') {
    scalar.deliveredAt = now;
    // COD — yetkazilganda naqd olindi.
    if (codSettled) {
      scalar.paidAt = now;
      scalar.paidTotal = order.grandTotal;
    }
  }

  // ATOMIK holat o'tishi — faqat joriy (kutilgan) statusdan. Parallel/duplikat PATCH count===0
  // oladi → ConcurrentTransitionError → tx rollback (double soldCount / COD settle oldini oladi).
  const moved = await tx.order.updateMany({
    where: { id: order.id, status: order.status as FulfillmentStatus },
    data: scalar,
  });
  if (moved.count === 0) throw new ConcurrentTransitionError();

  await tx.order.update({
    where: { id: order.id },
    data: {
      statusHistory: {
        create: {
          status: next,
          comment: opts.comment ?? `Holat: ${next}`,
          changedBy: opts.changedBy ?? null,
        },
      },
    },
  });

  if (codSettled) {
    // Faqat naqd to'lov yozuvi — boshqa provayderlarning PENDING yozuvlariga tegilmaydi.
    await tx.payment.updateMany({
      where: { orderId: order.id, provider: COD_PROVIDER, status: 'PENDING' },
      data: { status: 'PAID', paidAt: now },
    });
  }

  // soldCount — haqiqatan yetkazilgan tovarlar bo'yicha. Atomik status guard tufayli
  // DELIVERED o'tishi faqat bir marta amalga oshadi → ikki marta oshmaydi.
  if (next === 'DELIVERED') {
    for (const it of order.items) {
      await tx.product.update({
        where: { id: it.productId },
        data: { soldCount: { increment: it.quantity } },
      });
    }
  }

  return { codSettled, soldCountItems: next === 'DELIVERED' ? order.items.length : 0 };
}
