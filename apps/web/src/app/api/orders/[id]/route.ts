// GET   /api/orders/[id] — bitta buyurtma (egasi uchun)
// PATCH /api/orders/[id] — PENDING buyurtmani tahrirlash (manzil/telefon/izoh/yetkazish usuli)

import { Prisma } from '@ecom/database';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { COIN_VALUE_SOM, coinsForOrder } from '@/lib/loyalty';
import { shippingFor, type DeliveryMethod } from '@/lib/orders-pricing';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const orderSelect = Prisma.validator<Prisma.OrderSelect>()({
  id: true,
  number: true,
  status: true,
  subtotal: true,
  shippingTotal: true,
  discountTotal: true,
  grandTotal: true,
  promoCode: true,
  notes: true,
  deliveryMethod: true,
  userId: true,
  placedAt: true,
  paidAt: true,
  shippedAt: true,
  deliveredAt: true,
  cancelledAt: true,
  shippingAddressId: true,
  shippingAddress: {
    select: {
      recipientName: true,
      phone: true,
      region: true,
      city: true,
      district: true,
      street: true,
      building: true,
      apartment: true,
    },
  },
  items: {
    select: {
      id: true,
      quantity: true,
      nameSnapshot: true,
      unitPrice: true,
      totalPrice: true,
      product: {
        select: {
          slug: true,
          images: {
            orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  },
});

type OrderRow = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

function serialize(o: OrderRow) {
  return {
    id: o.id,
    number: o.number,
    status: o.status,
    subtotal: o.subtotal.toString(),
    shippingTotal: o.shippingTotal.toString(),
    discountTotal: o.discountTotal.toString(),
    grandTotal: o.grandTotal.toString(),
    promoCode: o.promoCode,
    notes: o.notes,
    deliveryMethod: o.deliveryMethod,
    placedAt: o.placedAt.toISOString(),
    paidAt: o.paidAt?.toISOString() ?? null,
    shippedAt: o.shippedAt?.toISOString() ?? null,
    deliveredAt: o.deliveredAt?.toISOString() ?? null,
    cancelledAt: o.cancelledAt?.toISOString() ?? null,
    editable: o.status === 'PENDING',
    scope: 'LOCAL' as const,
    shippingAddress: o.shippingAddress,
    itemCount: o.items.length,
    items: o.items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      nameSnapshot: i.nameSnapshot,
      unitPrice: i.unitPrice.toString(),
      totalPrice: i.totalPrice.toString(),
      slug: i.product?.slug ?? null,
      imageUrl: i.product?.images[0]?.url ?? null,
    })),
  };
}

function loadOrder(id: string) {
  return prisma.order.findUnique({ where: { id }, select: orderSelect });
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const order = await loadOrder(params.id);
  if (!order) return apiError(404, 'NOT_FOUND', 'Buyurtma topilmadi');
  if (order.userId !== user.id) return apiError(403, 'FORBIDDEN', "Ruxsat yo'q");

  return apiOk({ order: serialize(order) });
}

const patchSchema = z.object({
  recipientName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(9).max(20).optional(),
  region: z.string().trim().min(2).max(80).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  street: z.string().trim().min(2).max(200).optional(),
  apartment: z.string().trim().max(50).optional().nullable(),
  deliveryMethod: z.enum(['HOME_DELIVERY', 'PICKUP_POINT', 'EXPRESS']).optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const input = parsed.data;

  const existing = await loadOrder(params.id);
  if (!existing) return apiError(404, 'NOT_FOUND', 'Buyurtma topilmadi');
  if (existing.userId !== user.id) return apiError(403, 'FORBIDDEN', "Ruxsat yo'q");
  if (existing.status !== 'PENDING') {
    return apiError(
      409,
      'NOT_EDITABLE',
      'Buyurtma allaqachon qabul qilingan — tahrirlab bo‘lmaydi',
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    // 1. Manzil maydonlari (agar berilgan bo'lsa)
    if (
      existing.shippingAddressId &&
      (input.recipientName ||
        input.phone ||
        input.region ||
        input.city ||
        input.street ||
        input.apartment !== undefined)
    ) {
      await tx.userAddress.update({
        where: { id: existing.shippingAddressId },
        data: {
          ...(input.recipientName ? { recipientName: input.recipientName } : {}),
          ...(input.phone ? { phone: input.phone } : {}),
          ...(input.region ? { region: input.region } : {}),
          ...(input.city ? { city: input.city } : {}),
          ...(input.street ? { street: input.street } : {}),
          ...(input.apartment !== undefined ? { apartment: input.apartment } : {}),
        },
      });
    }

    // 2. Order maydonlari
    const data: Prisma.OrderUpdateInput = {};
    if (input.notes !== undefined) {
      data.notes = input.notes;
    }

    // 3. Yetkazish usuli o'zgarsa — narxni qayta hisoblaymiz
    if (input.deliveryMethod && input.deliveryMethod !== existing.deliveryMethod) {
      const subtotal = Number(existing.subtotal);
      const newShipping = shippingFor(input.deliveryMethod as DeliveryMethod, subtotal);

      // coin va promo chegirmalarini ajratamiz (discountTotal = promo + coin)
      const spendTxn = await tx.loyaltyTransaction.findFirst({
        where: { userId: user.id, reference: existing.number, reason: 'ORDER_SPEND' },
        select: { points: true },
      });
      const redeemed = spendTxn ? Math.abs(spendTxn.points) : 0;
      const coinDiscount = redeemed * COIN_VALUE_SOM;
      const oldPromoDiscount = Math.max(0, Number(existing.discountTotal) - coinDiscount);

      // FREE_SHIPPING promokod — chegirma yangi yetkazib berish narxiga teng
      let newPromoDiscount = oldPromoDiscount;
      if (existing.promoCode) {
        const promo = await tx.promoCode.findUnique({
          where: { code: existing.promoCode },
          select: { type: true },
        });
        if (promo?.type === 'FREE_SHIPPING') newPromoDiscount = newShipping;
      }

      const newDiscountTotal = newPromoDiscount + coinDiscount;
      const newGrandTotal = Math.max(0, subtotal + newShipping - newDiscountTotal);

      data.deliveryMethod = input.deliveryMethod;
      data.shippingTotal = new Prisma.Decimal(newShipping);
      data.discountTotal = new Prisma.Decimal(newDiscountTotal);
      data.grandTotal = new Prisma.Decimal(newGrandTotal);

      // earn coinlarni yangi summaga moslaymiz (PENDING'da darrov berilган edi)
      const earnTxn = await tx.loyaltyTransaction.findFirst({
        where: { userId: user.id, reference: existing.number, reason: 'ORDER_EARN' },
        select: { id: true, points: true },
      });
      const oldEarned = earnTxn?.points ?? 0;
      const newEarned = coinsForOrder(newGrandTotal);
      if (newEarned !== oldEarned) {
        if (earnTxn) {
          await tx.loyaltyTransaction.update({
            where: { id: earnTxn.id },
            data: { points: newEarned },
          });
        } else if (newEarned > 0) {
          await tx.loyaltyTransaction.create({
            data: {
              userId: user.id,
              points: newEarned,
              reason: 'ORDER_EARN',
              reference: existing.number,
            },
          });
        }
        const u = await tx.user.findUnique({
          where: { id: user.id },
          select: { loyaltyPoints: true },
        });
        const next = Math.max(0, (u?.loyaltyPoints ?? 0) + (newEarned - oldEarned));
        await tx.user.update({ where: { id: user.id }, data: { loyaltyPoints: next } });
      }
    }

    if (Object.keys(data).length > 0) {
      await tx.order.update({ where: { id: existing.id }, data });
    }

    const reloaded = await tx.order.findUnique({ where: { id: existing.id }, select: orderSelect });
    return reloaded!;
  });

  return apiOk({ order: serialize(updated) });
}
