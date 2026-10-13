// Pul tushgan payt (Click, Payme, chek tasdig'i) — buyurtmaning keyingi qadamlari bitta joyda:
// cashback beriladi, sotuvchilarga jo'natmalar ochiladi, narx taklifi bo'lsa «Buyurtma
// berildi» (ADR 0015). Idempotent.

import { grantOrderEarnForOrder } from './loyalty';
import { openSellerShipments } from './seller-shipments';

import type { Prisma } from '@ecom/database';

export async function onOrderPaid(
  tx: Prisma.TransactionClient,
  orderId: string,
  now: Date = new Date(),
): Promise<void> {
  await grantOrderEarnForOrder(tx, orderId);
  await openSellerShipments(tx, orderId, now);
  await tx.sourcingRequest.updateMany({
    where: { orderId, status: 'ACCEPTED' },
    data: { status: 'ORDERED' },
  });
}
