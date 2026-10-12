// Sellobay — Sello Coins server logikasi (faqat API route'lardan import qilinadi).
// Pure iqtisod helperlar `loyalty.ts` da (client+server). Buyurtmaga bog'liq tranzaksion
// yozuvlar (settle/reverse/grant) `@ecom/order-ops` da — admin va NestJS ham shundan oladi.

import { tashkentDayStart } from '@ecom/core-domain';
import { prisma } from './db';

export {
  InsufficientCoinsError,
  grantOrderEarn,
  reverseOrderLoyalty,
  settleOrderLoyalty,
  type OrderLoyaltyResult,
} from '@ecom/order-ops';

export const CHECKIN_REWARD = 5;

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
