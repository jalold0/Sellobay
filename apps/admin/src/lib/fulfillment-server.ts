// Sellobay — Buyurtma fulfillment (status o'tishi) server logikasi.
// Faqat admin API route'idan chaqiriladi. inventory-server / loyalty-server pattern'i:
// funksiyalar `tx: Prisma.TransactionClient` qabul qiladi — chaqiruvchi $transaction'ni ochadi.

import type { Prisma } from '@ecom/database';

// Kanonik fulfillment tartibi — o'tish faqat OLDINGA (indeks ortishi) ruxsat etiladi.
export const FULFILLMENT_FLOW = [
  'PENDING',
  'CONFIRMED',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
] as const;

export type FulfillmentStatus = (typeof FULFILLMENT_FLOW)[number];

// Bu endpoint orqali qo'yish mumkin bo'lgan target statuslar (PENDING'ga qaytarib bo'lmaydi).
export const FULFILLMENT_TARGETS: FulfillmentStatus[] = [
  'CONFIRMED',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

/** `from` statusdan `to` ga oldinga o'tish mumkinmi? (from FLOW'da bo'lishi va to undan keyin). */
export function canTransition(from: string, to: FulfillmentStatus): boolean {
  const f = FULFILLMENT_FLOW.indexOf(from as FulfillmentStatus);
  const t = FULFILLMENT_FLOW.indexOf(to);
  return f !== -1 && t > f;
}

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
 *   • DELIVERED → deliveredAt + soldCount++ (yetkazilgan = sotilgan) va COD bo'lsa Payment PAID.
 * Transition qonuniyligi (canTransition) chaqiruvchida tekshirilishi shart.
 */
export async function applyFulfillmentTransition(
  tx: Prisma.TransactionClient,
  order: FulfillmentOrder,
  next: FulfillmentStatus,
  opts: { changedBy?: string | null; comment?: string } = {},
): Promise<FulfillmentResult> {
  const now = new Date();
  const codSettled = next === 'DELIVERED' && !order.paidAt;

  // Skalyar maydonlar — ATOMIK shartli UPDATE bilan yoziladi (nested yozuvsiz).
  const scalar: Record<string, unknown> = { status: next };
  if ((next === 'SHIPPED' || next === 'OUT_FOR_DELIVERY') && !order.shippedAt) {
    scalar.shippedAt = now;
  }
  if (next === 'DELIVERED') {
    scalar.deliveredAt = now;
    // COD — yetkazilganda naqd olindi. Faqat hali to'lanmagan bo'lsa (onlayn allaqachon PAID).
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

  if (next === 'DELIVERED' && codSettled) {
    await tx.payment.updateMany({
      where: { orderId: order.id, status: 'PENDING' },
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
