// Buyurtma DELIVERED bo'lganining yon ta'sirlari — kim yetkazganidan qat'i nazar
// (admin fulfillment yoki kuryer ilovasi).
//
// Ilgari bu faqat admin PATCH'ida edi: kuryer «yetkazildi» bosganda buyurtma DELIVERED
// bo'lardi, lekin naqd to'lov PENDING qolar, `paidAt` bo'sh, `soldCount` oshmasdi (audit Y10).

import { COD_PROVIDER, orderPaymentState } from '@ecom/core-domain';

import { recordSaleLedger } from './ledger';
import { grantOrderEarnForOrder } from './loyalty';

import type { Prisma } from '@ecom/database';

export interface DeliveredResult {
  /** Naqd (COD) to'lov shu chaqiruvda PAID qilindimi. */
  codSettled: boolean;
  /** soldCount oshirilgan satrlar soni. */
  soldCountItems: number;
}

/**
 * Buyurtma DELIVERED'ga o'tgan $transaction ichida chaqiriladi:
 *   • naqd buyurtma — COD Payment PAID + order.paidAt/paidTotal (pul kuryerda olindi) va cashback;
 *   • soldCount++ (yetkazilgan = sotilgan; qaytarilsa return route kamaytiradi);
 *   • sotuvchi hisob daftari — sotuv, komissiya, xizmat haqi (ADR 0015; idempotent).
 *
 * Bir marta chaqirilishi CHAQIRUVCHINING atomik status o'tishi bilan kafolatlanadi
 * (`updateMany where status = <oldingi>` count===1). COD qismi qo'shimcha ravishda
 * `paidAt: null` sharti bilan himoyalangan — ikki marta PAID bo'lmaydi.
 */
export async function settleDeliveredOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  now: Date = new Date(),
): Promise<DeliveredResult> {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      grandTotal: true,
      paidAt: true,
      payments: { select: { provider: true, status: true } },
      items: { select: { productId: true, quantity: true } },
    },
  });

  let codSettled = false;
  if (orderPaymentState(order) === 'COD_PENDING') {
    const paid = await tx.order.updateMany({
      where: { id: orderId, paidAt: null },
      data: { paidAt: now, paidTotal: order.grandTotal },
    });
    if (paid.count > 0) {
      // Faqat naqd to'lov yozuvi — boshqa provayderlarning PENDING yozuvlariga tegilmaydi.
      await tx.payment.updateMany({
        where: { orderId, provider: COD_PROVIDER, status: 'PENDING' },
        data: { status: 'PAID', paidAt: now },
      });
      codSettled = true;
      // Naqd buyurtmada pul shu yerda tushdi — cashback ham endi (audit O1).
      await grantOrderEarnForOrder(tx, orderId);
    }
  }

  for (const it of order.items) {
    await tx.product.update({
      where: { id: it.productId },
      data: { soldCount: { increment: it.quantity } },
    });
  }

  await recordSaleLedger(tx, orderId, now);

  return { codSettled, soldCountItems: order.items.length };
}
