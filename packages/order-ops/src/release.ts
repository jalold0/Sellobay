// Sellobay — bekor qilingan (yoki puli qaytarilgan) buyurtmaning yon ta'sirlarini qaytarish.
//
// NEGA BITTA JOYDA: bekor qilish bir necha yo'ldan keladi — mijoz, Payme CancelTransaction,
// muddati o'tgan to'lanmagan buyurtma. Ilgari har biri o'zicha qaytarardi va Payme yo'li zaxira
// bilan promoni umuman qaytarmasdi (audit Y7), mijoz bekor qilganda esa kuryer topshirig'i va
// kutilayotgan karta to'lovi ochiq qolardi (audit Y9).
//
// Chaqiruvchi buyurtma holatini ATOMIK o'zgartirgan bo'lishi shart (faqat bitta jarayon
// "bekor qildim" deya oladi). Shunga qaramay ichki qadamlar ham idempotent.

import { restockOrder } from './inventory';
import { reverseOrderLoyalty } from './loyalty';
import { cancelSellerShipments } from './seller-shipments';

import type { Prisma } from '@ecom/database';

export interface ReleasableOrder {
  id: string;
  number: string;
  userId: string | null;
  promoCode: string | null;
}

export interface ReleaseResult {
  stock: { restocked: number; skipped: string[] };
  loyalty: { refunded: number; revoked: number };
  deliveriesClosed: number;
  paymentsCancelled: number;
}

/**
 * Promokodni qaytaradi: usedCount kamayadi (manfiyga tushmaydi), UserCoupon qayta ishlatiladigan
 * bo'ladi. Bekor qilish va qaytarish (return) ikkalasi ham shu yerdan.
 */
export async function releaseOrderPromo(
  tx: Prisma.TransactionClient,
  order: Pick<ReleasableOrder, 'userId' | 'promoCode'>,
): Promise<void> {
  if (!order.promoCode) return;
  const promo = await tx.promoCode.findUnique({
    where: { code: order.promoCode },
    select: { id: true },
  });
  if (!promo) return;
  await tx.promoCode.updateMany({
    where: { id: promo.id, usedCount: { gt: 0 } },
    data: { usedCount: { decrement: 1 } },
  });
  if (order.userId) {
    await tx.userCoupon.updateMany({
      where: { userId: order.userId, promoCodeId: promo.id },
      data: { redeemedAt: null },
    });
  }
}

/**
 * Bitta $transaction ichida:
 *  - zaxira (faqat `restock: true` bo'lsa — tovar hali jo'natilmagan);
 *  - Sello Coins: sarflangani qaytadi, berilgani olinadi;
 *  - promokod: usedCount kamayadi, UserCoupon qayta ishlatiladigan bo'ladi;
 *  - hali yo'lga chiqmagan (ASSIGNED) chiqish yetkazishi yopiladi — kuryer ro'yxatida qolmaydi;
 *  - kutilayotgan offline to'lov (karta cheki, naqd) bekor qilinadi — admin navbatida qolmaydi.
 */
export async function releaseCancelledOrder(
  tx: Prisma.TransactionClient,
  order: ReleasableOrder,
  opts: { restock: boolean; reason: string },
): Promise<ReleaseResult> {
  const now = new Date();

  const stock = opts.restock
    ? await restockOrder(tx, order.id, order.number, opts.reason)
    : { restocked: 0, skipped: [] };

  const loyalty = order.userId
    ? await reverseOrderLoyalty(tx, order.userId, order.number)
    : { refunded: 0, revoked: 0 };

  await releaseOrderPromo(tx, order);

  const deliveries = await tx.delivery.updateMany({
    where: { orderId: order.id, kind: 'OUTBOUND', status: 'ASSIGNED' },
    data: { status: 'FAILED', failureReason: `Buyurtma bekor qilindi: ${opts.reason}` },
  });

  const payments = await tx.payment.updateMany({
    where: { orderId: order.id, status: 'PENDING' },
    data: { status: 'CANCELLED', failedAt: now },
  });

  // Sotuvchi qadoqlab yurmasin — ochiq jo'natmalar yopiladi (ADR 0015).
  await cancelSellerShipments(tx, order.id, now);

  return {
    stock,
    loyalty,
    deliveriesClosed: deliveries.count,
    paymentsCancelled: payments.count,
  };
}
