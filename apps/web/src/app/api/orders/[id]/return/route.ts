// POST /api/orders/[id]/return — yetkazilgan buyurtmani qaytarish.
// Gibrid siyosat: DELIVERED holatda, yetkazilgandan 14 kun ichida (qonuniy asos).
//   • Punktda tekshirib rad etish yoki uyga yetkazilganini muddat ichida qaytarish.
//   • Sello Coins (cashback revoke + ishlatilgan coin refund) + promokod atomik qaytariladi.
//   • PUL REFUNDI — ops/qo'lda ishlanadi: bu yerda gateway'ga AVTO-REFUND YO'Q.
//     Status RETURNED operatorlarga "refund kutilmoqda" signalini beradi (→ REFUNDED).

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { reverseOrderLoyalty } from '@/lib/loyalty-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RETURN_WINDOW_DAYS = 14;
const RETURN_WINDOW_MS = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

const schema = z.object({ reason: z.string().trim().max(300).optional() });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});
  const reason = parsed.success ? parsed.data.reason : undefined;

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      number: true,
      status: true,
      userId: true,
      promoCode: true,
      deliveredAt: true,
    },
  });
  if (!order) return apiError(404, 'NOT_FOUND', 'Buyurtma topilmadi');
  if (order.userId !== user.id) return apiError(403, 'FORBIDDEN', "Ruxsat yo'q");
  if (order.status !== 'DELIVERED') {
    return apiError(
      409,
      'NOT_RETURNABLE',
      'Faqat yetkazilgan (yoki punktda olingan) buyurtmani qaytarish mumkin',
    );
  }
  // 14 kunlik qaytarish oynasi — yetkazilgan sanadan boshlab
  if (order.deliveredAt && Date.now() - order.deliveredAt.getTime() > RETURN_WINDOW_MS) {
    return apiError(
      409,
      'RETURN_WINDOW_PASSED',
      `Qaytarish muddati (${RETURN_WINDOW_DAYS} kun) o'tgan`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const comment = reason?.trim() || 'Mijoz qaytardi (punktda tekshiruv)';

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'RETURNED',
        statusHistory: { create: { status: 'RETURNED', comment } },
      },
    });

    // Sello Coins — cashback qaytarib olinadi, ishlatilgan coin qaytariladi (cancel'dagidek)
    const loyalty = await reverseOrderLoyalty(tx, user.id, order.number);

    // Promokod — usedCount kamaytirish + UserCoupon redeemed bekor
    if (order.promoCode) {
      const promo = await tx.promoCode.findUnique({
        where: { code: order.promoCode },
        select: { id: true, usedCount: true },
      });
      if (promo) {
        await tx.promoCode.update({
          where: { id: promo.id },
          data: { usedCount: { decrement: promo.usedCount > 0 ? 1 : 0 } },
        });
        await tx.userCoupon.updateMany({
          where: { userId: user.id, promoCodeId: promo.id },
          data: { redeemedAt: null },
        });
      }
    }

    return loyalty;
  });

  return apiOk({
    id: order.id,
    status: 'RETURNED',
    coinsRefunded: result.refunded,
    coinsRevoked: result.revoked,
    // Pul refundi ops/qo'lda ishlanadi (gateway avto-refund yo'q)
    refundPending: true,
  });
}
