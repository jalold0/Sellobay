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
import { restockOrder } from '@/lib/inventory-server';
import { reverseOrderLoyalty } from '@/lib/loyalty-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RETURN_WINDOW_DAYS = 14;
const RETURN_WINDOW_MS = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

const schema = z.object({ reason: z.string().trim().max(300).optional() });

/** Parallel so'rov holatni allaqachon o'zgartirgan bo'lsa — tx rollback qilinadi. */
class OrderStateChangedError extends Error {
  constructor() {
    super('ORDER_STATE_CHANGED');
    this.name = 'OrderStateChangedError';
  }
}

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
      placedAt: true,
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
  // 14 kunlik qaytarish oynasi — yetkazilgan sanadan (yo'q bo'lsa buyurtma sanasidan) boshlab.
  // deliveredAt null bo'lsa ham oyna qo'llanadi (aks holda muddat cheklovi butunlay chetlab o'tiladi).
  const returnRef = order.deliveredAt ?? order.placedAt;
  if (Date.now() - returnRef.getTime() > RETURN_WINDOW_MS) {
    return apiError(
      409,
      'RETURN_WINDOW_PASSED',
      `Qaytarish muddati (${RETURN_WINDOW_DAYS} kun) o'tgan`,
    );
  }

  let result;
  try {
    result = await prisma.$transaction(async (tx) => {
      const comment = reason?.trim() || 'Mijoz qaytardi (punktda tekshiruv)';

      // ATOMIK holat o'tishi — faqat hali DELIVERED bo'lsa. Parallel qaytarish so'rovlaridan
      // ikkinchisi count===0 oladi → tx rollback (double restock/refund/soldCount oldini oladi).
      const moved = await tx.order.updateMany({
        where: { id: order.id, status: 'DELIVERED' },
        data: { status: 'RETURNED' },
      });
      if (moved.count === 0) throw new OrderStateChangedError();

      await tx.order.update({
        where: { id: order.id },
        data: { statusHistory: { create: { status: 'RETURNED', comment } } },
      });

      // Ombor — qaytarilgan tovarlar zaxiraga qaytadi (increment) + RETURN StockMovement
      const stock = await restockOrder(tx, order.id, order.number, 'ORDER_RETURNED');

      // soldCount — yetkazilganda oshirilgan edi; qaytarilganda kamaytiramiz (popularity aniqligi).
      // gte guard manfiyga tushib ketishdan saqlaydi (legacy/yetkazilgangacha bo'lgan buyurtmalar).
      const soldItems = await tx.orderItem.findMany({
        where: { orderId: order.id },
        select: { productId: true, quantity: true },
      });
      for (const it of soldItems) {
        await tx.product.updateMany({
          where: { id: it.productId, soldCount: { gte: it.quantity } },
          data: { soldCount: { decrement: it.quantity } },
        });
      }

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

      return { loyalty, stock };
    });
  } catch (e) {
    if (e instanceof OrderStateChangedError) {
      return apiError(409, 'NOT_RETURNABLE', 'Buyurtma allaqachon qayta ishlangan');
    }
    throw e;
  }

  return apiOk({
    id: order.id,
    status: 'RETURNED',
    coinsRefunded: result.loyalty.refunded,
    coinsRevoked: result.loyalty.revoked,
    stockRestocked: result.stock.restocked,
    // Pul refundi ops/qo'lda ishlanadi (gateway avto-refund yo'q)
    refundPending: true,
  });
}
