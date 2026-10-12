// Sello Coins — buyurtmaga bog'liq yozuvlar ($transaction ichida chaqiriladi).
// Iqtisod formulalari @ecom/core-domain'da; bu yerda faqat Prisma yozuvlari.

import { coinsForOrder } from '@ecom/core-domain';

import type { Prisma } from '@ecom/database';

/** Yozish paytida coin balansi yetmay qoldi (parallel buyurtma ishlatib qo'ygan). Tx rollback. */
export class InsufficientCoinsError extends Error {
  constructor() {
    super('INSUFFICIENT_COINS');
    this.name = 'InsufficientCoinsError';
  }
}

export interface OrderLoyaltyResult {
  earned: number;
  redeemed: number;
}

/** Buyurtma uchun Sello Coins hisob-kitobi — bitta $transaction ichida atomik:
 *   • redeem (spend): manfiy LoyaltyTransaction
 *   • earn: to'langan summa bo'yicha musbat LoyaltyTransaction
 *   • User.loyaltyPoints ga net (earned − redeemed) qo'llaniladi
 *  redeemCoins chaqiruvchi tomonidan balans va summaga nisbatan allaqachon
 *  cheklab berilishi shart (overspend bo'lmasligi uchun). */
export async function settleOrderLoyalty(
  tx: Prisma.TransactionClient,
  userId: string,
  paidTotalSom: number,
  redeemCoins: number,
  orderNumber: string,
  opts: { grantEarn?: boolean } = {},
): Promise<OrderLoyaltyResult> {
  // grantEarn=false — earn (cashback) hali kreditlanmaydi (masalan karta orqali qo'lda to'lov:
  // coinlar admin to'lovni tasdiqlaganda beriladi, to'lanmagan buyurtmadan coin "farming" bo'lmasin).
  const grantEarn = opts.grantEarn ?? true;
  const redeemed = Math.max(0, Math.floor(redeemCoins));
  const earned = grantEarn ? coinsForOrder(paidTotalSom) : 0;

  if (redeemed > 0) {
    await tx.loyaltyTransaction.create({
      data: { userId, points: -redeemed, reason: 'ORDER_SPEND', reference: orderNumber },
    });
  }
  if (earned > 0) {
    await tx.loyaltyTransaction.create({
      data: { userId, points: earned, reason: 'ORDER_EARN', reference: orderNumber },
    });
  }

  const net = earned - redeemed;
  if (redeemed > 0) {
    // ATOMIK: balans yozish paytida ham yetarli bo'lishi shart. Chaqiruvchi balansni
    // oldinroq o'qigan — ikki parallel buyurtma bir xil coinlarni ikki marta ishlata olardi
    // (audit Y11). Yetmasa tranzaksiya to'liq bekor qilinadi.
    const moved = await tx.user.updateMany({
      where: { id: userId, loyaltyPoints: { gte: redeemed } },
      data: { loyaltyPoints: { increment: net } },
    });
    if (moved.count === 0) throw new InsufficientCoinsError();
  } else if (net !== 0) {
    await tx.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: net } },
    });
  }

  return { earned, redeemed };
}

/**
 * Kechiktirilgan cashback'ni beradi (masalan karta to'lovi tasdiqlanganda). Idempotent:
 * shu buyurtma bo'yicha ORDER_EARN allaqachon bo'lsa — hech narsa qilmaydi.
 */
export async function grantOrderEarn(
  tx: Prisma.TransactionClient,
  userId: string,
  paidTotalSom: number,
  orderNumber: string,
): Promise<number> {
  const already = await tx.loyaltyTransaction.count({
    where: { userId, reference: orderNumber, reason: 'ORDER_EARN' },
  });
  if (already > 0) return 0;
  const earned = coinsForOrder(paidTotalSom);
  if (earned <= 0) return 0;
  await tx.loyaltyTransaction.create({
    data: { userId, points: earned, reason: 'ORDER_EARN', reference: orderNumber },
  });
  await tx.user.update({ where: { id: userId }, data: { loyaltyPoints: { increment: earned } } });
  return earned;
}

/** Buyurtma bekor qilinganda Sello Coins'ni qaytaradi (create'dagi net'ni teskari qiladi):
 *   • ishlatilgan (redeemed) coinlar qaytariladi
 *   • berilgan (earned) coinlar olib qo'yiladi
 *   • ADJUSTMENT yozuvi audit uchun
 *  Bir $transaction ichida chaqirilishi shart (bekor qilish bilan atomik). Idempotent. */
export async function reverseOrderLoyalty(
  tx: Prisma.TransactionClient,
  userId: string,
  orderNumber: string,
): Promise<{ refunded: number; revoked: number }> {
  // Bu buyurtma bo'yicha qaytarish allaqachon yozilgan bo'lsa — qayta qilmaymiz
  // (aks holda coin ikki marta qaytarilardi/olinardi).
  const alreadyReversed = await tx.loyaltyTransaction.count({
    where: { userId, reference: `${orderNumber}:cancel`, reason: 'ADJUSTMENT' },
  });
  if (alreadyReversed > 0) return { refunded: 0, revoked: 0 };

  const txns = await tx.loyaltyTransaction.findMany({
    where: { userId, reference: orderNumber, reason: { in: ['ORDER_SPEND', 'ORDER_EARN'] } },
    select: { points: true, reason: true },
  });
  let redeemed = 0;
  let earned = 0;
  for (const t of txns) {
    if (t.reason === 'ORDER_SPEND') redeemed += Math.abs(t.points);
    else if (t.reason === 'ORDER_EARN') earned += t.points;
  }
  // create'da net = earned − redeemed qo'llangan edi; bekor qilish uni teskari qiladi
  const undo = redeemed - earned; // loyaltyPoints ga shuni qo'shamiz
  if (undo !== 0) {
    await tx.loyaltyTransaction.create({
      data: {
        userId,
        points: undo,
        reason: 'ADJUSTMENT',
        reference: `${orderNumber}:cancel`,
      },
    });
    const u = await tx.user.findUnique({ where: { id: userId }, select: { loyaltyPoints: true } });
    const next = Math.max(0, (u?.loyaltyPoints ?? 0) + undo);
    await tx.user.update({ where: { id: userId }, data: { loyaltyPoints: next } });
  }
  return { refunded: redeemed, revoked: earned };
}
