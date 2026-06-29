// POST /api/orders — buyurtma yaratish (web + mobile uchun umumiy)
// GET /api/orders — joriy foydalanuvchining buyurtmalari ro'yxati

import { NextRequest } from 'next/server';
import { Prisma } from '@ecom/database';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { COIN_VALUE_SOM } from '@/lib/loyalty';
import { settleOrderLoyalty } from '@/lib/loyalty-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const itemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive().max(999),
  variantId: z.string().uuid().optional().nullable(),
});

const createSchema = z.object({
  items: z.array(itemSchema).min(1, "Buyurtmada kamida 1 ta mahsulot bo'lishi kerak"),
  // Manzil ma'lumotlari
  recipientName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(9).max(20),
  region: z.string().trim().min(2).max(80).default('Toshkent'),
  city: z.string().trim().min(2).max(80),
  street: z.string().trim().min(2).max(200),
  apartment: z.string().trim().max(50).optional().nullable(),
  // Yetkazib berish va to'lov
  deliveryMethod: z.enum(['HOME_DELIVERY', 'PICKUP_POINT', 'EXPRESS']).default('HOME_DELIVERY'),
  paymentProvider: z
    .enum(['CLICK', 'PAYME', 'UZUM_BANK', 'UZCARD', 'HUMO', 'CASH_ON_DELIVERY'])
    .default('CLICK'),
  promoCode: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  // Sello Coins — ishlatmoqchi bo'lgan coinlar (login user uchun; backend cheklaydi)
  redeemCoins: z.number().int().min(0).max(10_000_000).optional(),
});

const SHIPPING_FEE = 20_000;
const EXPRESS_FEE = 50_000;
const FREE_SHIPPING_THRESHOLD = 500_000;

function generateOrderNumber(): string {
  const year = 2026; // statik — Date.now() server timezone'idan ehtiyot
  const rand = Math.floor(Math.random() * 99_999_999)
    .toString()
    .padStart(8, '0');
  return `ORD-${year}-${rand}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const input = parsed.data;
  const currentUser = await getCurrentUser();

  // 1. Mahsulotlarni DB'dan olamiz (snapshot uchun) va mavjudligini tekshiramiz
  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, status: 'ACTIVE', deletedAt: null },
    select: {
      id: true,
      slug: true,
      sku: true,
      name: true,
      basePrice: true,
      taxRate: true,
      sellerId: true,
    },
  });
  if (products.length !== productIds.length) {
    return apiError(400, 'PRODUCT_NOT_FOUND', "Ba'zi mahsulotlar topilmadi yoki faol emas");
  }
  const productById = new Map(products.map((p) => [p.id, p]));

  // 2. Subtotal hisoblash
  let subtotal = new Prisma.Decimal(0);
  const orderItemsData = input.items.map((it) => {
    const p = productById.get(it.productId)!;
    const unitPrice = p.basePrice;
    const totalPrice = unitPrice.mul(it.quantity);
    subtotal = subtotal.add(totalPrice);
    return {
      productId: p.id,
      variantId: it.variantId ?? null,
      sellerId: p.sellerId ?? null,
      sku: p.sku,
      nameSnapshot: p.name as Prisma.InputJsonValue,
      quantity: it.quantity,
      unitPrice,
      taxRate: p.taxRate,
      totalPrice,
    };
  });

  // 3. Yetkazib berish narxi
  let shippingTotal = new Prisma.Decimal(0);
  if (input.deliveryMethod === 'EXPRESS') {
    shippingTotal = new Prisma.Decimal(EXPRESS_FEE);
  } else if (input.deliveryMethod === 'HOME_DELIVERY') {
    if (subtotal.lt(FREE_SHIPPING_THRESHOLD)) {
      shippingTotal = new Prisma.Decimal(SHIPPING_FEE);
    }
  }
  const baseTotal = subtotal.add(shippingTotal); // chegirmagacha

  // 4. Manzil saqlash (faqat ro'yxatdan o'tgan user uchun)
  let shippingAddressId: string | null = null;
  if (currentUser) {
    const address = await prisma.userAddress.create({
      data: {
        userId: currentUser.id,
        recipientName: input.recipientName,
        phone: input.phone,
        region: input.region,
        city: input.city,
        street: input.street,
        apartment: input.apartment ?? null,
      },
      select: { id: true },
    });
    shippingAddressId = address.id;
  }

  // 5. Order + OrderItems + Sello Coins (atomik $transaction)
  //    Order, redeem (spend) va earn yozuvlari birga commit/rollback —
  //    balans hech qachon haqiqiy buyurtmalar bilan nomuvofiq bo'lmaydi.
  const orderNumber = generateOrderNumber();
  const { order, coinsEarned, coinsRedeemed, discountSom } = await prisma.$transaction(
    async (tx) => {
      // 5a. Redeem hisob-kitobi (faqat login user) — balansni TX ichida o'qib cheklaymiz
      let redeemed = 0;
      let discount = new Prisma.Decimal(0);
      if (currentUser && input.redeemCoins && input.redeemCoins > 0) {
        const u = await tx.user.findUnique({
          where: { id: currentUser.id },
          select: { loyaltyPoints: true },
        });
        const balance = u?.loyaltyPoints ?? 0;
        // chegirma summadan oshmasin (total < 0 bo'lmasin) va balansdan oshmasin
        const maxByTotal = Math.floor(baseTotal.toNumber() / COIN_VALUE_SOM);
        redeemed = Math.max(0, Math.min(input.redeemCoins, balance, maxByTotal));
        discount = new Prisma.Decimal(redeemed * COIN_VALUE_SOM);
      }
      const grandTotal = baseTotal.sub(discount);

      const created = await tx.order.create({
        data: {
          number: orderNumber,
          userId: currentUser?.id ?? null,
          guestEmail: null, // hozir guest uchun email yo'q
          guestPhone: currentUser ? null : input.phone,
          status: 'PENDING',
          subtotal,
          shippingTotal,
          discountTotal: discount,
          grandTotal,
          shippingAddressId,
          deliveryMethod: input.deliveryMethod,
          promoCode: input.promoCode ?? null,
          notes: input.notes
            ? `${input.notes} | To'lov: ${input.paymentProvider}`
            : `To'lov: ${input.paymentProvider}`,
          items: { create: orderItemsData },
          statusHistory: {
            create: { status: 'PENDING', comment: 'Buyurtma yaratildi' },
          },
        },
        select: {
          id: true,
          number: true,
          status: true,
          grandTotal: true,
          placedAt: true,
        },
      });

      // 5b. Sello Coins settle (earn to'langan summa bo'yicha, spend redeemed)
      let earned = 0;
      if (currentUser) {
        const settled = await settleOrderLoyalty(
          tx,
          currentUser.id,
          grandTotal.toNumber(),
          redeemed,
          orderNumber,
        );
        earned = settled.earned;
      }
      return {
        order: created,
        coinsEarned: earned,
        coinsRedeemed: redeemed,
        discountSom: discount.toNumber(),
      };
    },
  );

  return apiOk({
    order: {
      id: order.id,
      number: order.number,
      status: order.status,
      grandTotal: order.grandTotal.toString(),
      placedAt: order.placedAt.toISOString(),
      coinsEarned,
      coinsRedeemed,
      discountSom,
    },
  });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { placedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      number: true,
      status: true,
      grandTotal: true,
      placedAt: true,
      paidAt: true,
      shippedAt: true,
      deliveredAt: true,
      cancelledAt: true,
      deliveryMethod: true,
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
    },
  });

  return apiOk({
    items: orders.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      grandTotal: o.grandTotal.toString(),
      placedAt: o.placedAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      shippedAt: o.shippedAt?.toISOString() ?? null,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
      cancelledAt: o.cancelledAt?.toISOString() ?? null,
      deliveryMethod: o.deliveryMethod,
      // Hozircha barcha buyurtmalar lokal (UZ). Global (chegaralararo) keyingi bosqichda.
      scope: 'LOCAL' as const,
      shippingAddress: o.shippingAddress
        ? {
            recipientName: o.shippingAddress.recipientName,
            phone: o.shippingAddress.phone,
            region: o.shippingAddress.region,
            city: o.shippingAddress.city,
            district: o.shippingAddress.district,
            street: o.shippingAddress.street,
            building: o.shippingAddress.building,
            apartment: o.shippingAddress.apartment,
          }
        : null,
      itemCount: o.items.length,
      items: o.items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        nameSnapshot: i.nameSnapshot,
        totalPrice: i.totalPrice.toString(),
        slug: i.product?.slug ?? null,
        imageUrl: i.product?.images[0]?.url ?? null,
      })),
    })),
  });
}
