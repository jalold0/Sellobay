// Sellobay — Sello Coins server logikasi (faqat API route'lardan import qilinadi).
// Pure iqtisod helperlar `loyalty.ts` da (client+server). Bu yerda Prisma yozuvlari.

import type { Prisma } from '@ecom/database';

import { prisma } from './db';
import { coinsForOrder } from './loyalty';

export const CHECKIN_REWARD = 5;

// Asia/Tashkent (UTC+5, DST yo'q) — joriy kun boshlanishi (UTC instant).
function tashkentDayStart(): Date {
  const OFFSET_MS = 5 * 60 * 60 * 1000;
  const shifted = new Date(Date.now() + OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - OFFSET_MS);
}

/** Bugun (Tashkent kuni) check-in qilinganmi? */
export async function hasCheckedInToday(userId: string): Promise<boolean> {
  const count = await prisma.loyaltyTransaction.count({
    where: { userId, reason: 'DAILY_CHECKIN', createdAt: { gte: tashkentDayStart() } },
  });
  return count > 0;
}

export interface CheckinResult {
  alreadyClaimed: boolean;
  awarded: number;
  balance: number;
}

/** Kunlik check-in — kuniga 1 marta +5 coin. Atomik (double-claim race oldini oladi). */
export async function claimDailyCheckin(userId: string): Promise<CheckinResult> {
  const dayStart = tashkentDayStart();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.loyaltyTransaction.count({
      where: { userId, reason: 'DAILY_CHECKIN', createdAt: { gte: dayStart } },
    });
    if (existing > 0) {
      const u = await tx.user.findUnique({
        where: { id: userId },
        select: { loyaltyPoints: true },
      });
      return { alreadyClaimed: true, awarded: 0, balance: u?.loyaltyPoints ?? 0 };
    }
    await tx.loyaltyTransaction.create({
      data: { userId, points: CHECKIN_REWARD, reason: 'DAILY_CHECKIN', reference: 'checkin' },
    });
    const updated = await tx.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: CHECKIN_REWARD } },
      select: { loyaltyPoints: true },
    });
    return { alreadyClaimed: false, awarded: CHECKIN_REWARD, balance: updated.loyaltyPoints };
  });
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
): Promise<OrderLoyaltyResult> {
  const redeemed = Math.max(0, Math.floor(redeemCoins));
  const earned = coinsForOrder(paidTotalSom);

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
  if (net !== 0) {
    await tx.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: net } },
    });
  }

  return { earned, redeemed };
}

/** Buyurtma bekor qilinganda Sello Coins'ni qaytaradi (create'dagi net'ni teskari qiladi):
 *   • ishlatilgan (redeemed) coinlar qaytariladi
 *   • berilgan (earned) coinlar olib qo'yiladi
 *   • ADJUSTMENT yozuvi audit uchun
 *  Bir $transaction ichida chaqirilishi shart (bekor qilish bilan atomik). */
export async function reverseOrderLoyalty(
  tx: Prisma.TransactionClient,
  userId: string,
  orderNumber: string,
): Promise<{ refunded: number; revoked: number }> {
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
  // create'da net = earned − redeemed qo'llanган edi; bekor qilish uni teskari qiladi
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

// LoyaltyTransaction.reason → i18n kalit (loyalty.history.<key>)
const REASON_TO_KEY: Record<string, string> = {
  ORDER_EARN: 'orderEarn',
  ORDER_SPEND: 'discount',
  REVIEW: 'review',
  REFERRAL: 'referral',
  DAILY_CHECKIN: 'checkin',
  ADJUSTMENT: 'orderEarn',
};

export function reasonToKey(reason: string): string {
  return REASON_TO_KEY[reason] ?? 'orderEarn';
}
