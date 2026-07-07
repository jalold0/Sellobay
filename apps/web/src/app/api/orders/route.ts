// POST /api/orders — buyurtma yaratish (web + mobile uchun umumiy)
// GET /api/orders — joriy foydalanuvchining buyurtmalari ro'yxati

import { Prisma } from '@ecom/database';
import { isInTashkentCity } from '@ecom/utils';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import {
  deductStockForOrder,
  InsufficientStockError,
  type StockLine,
} from '@/lib/inventory-server';
import { COIN_VALUE_SOM } from '@/lib/loyalty';
import { settleOrderLoyalty } from '@/lib/loyalty-server';
import {
  MANUAL_CARD_PROVIDER,
  validateReceiptDataUrl,
} from '@/lib/manual-payment';
import { isOnlineProvider, type PaymentProvider } from '@/lib/payments';
import { evaluatePromo } from '@/lib/promo';

import type { NextRequest } from 'next/server';

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
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  // Yetkazib berish va to'lov
  deliveryMethod: z.enum(['HOME_DELIVERY', 'PICKUP_POINT', 'EXPRESS']).default('HOME_DELIVERY'),
  pickupPointId: z.string().uuid().optional().nullable(),
  paymentProvider: z
    .enum(['CLICK', 'PAYME', 'UZUM_BANK', 'UZCARD', 'HUMO', 'CASH_ON_DELIVERY'])
    .default('CLICK'),
  promoCode: z.string().trim().max(40).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  // Karta orqali qo'lda to'lov (UZCARD) — chek (data-URL rasm) + ixtiyoriy izoh.
  paymentReceipt: z.string().max(5_200_000).optional().nullable(),
  paymentNote: z.string().trim().max(300).optional().nullable(),
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

  // Karta orqali qo'lda to'lov (UZCARD) — chek majburiy va to'g'ri formatda bo'lishi shart.
  if (input.paymentProvider === MANUAL_CARD_PROVIDER) {
    const r = validateReceiptDataUrl(input.paymentReceipt);
    if (!r.ok) return apiError(400, 'RECEIPT_REQUIRED', r.error);
  }

  // Uygacha/Express yetkazish FAQAT Toshkent shahar uchun. Koordinata berilgan
  // bo'lsa (mobil) — shahar tashqarisini rad etamiz (punktdan foydalanilsin).
  if (
    (input.deliveryMethod === 'HOME_DELIVERY' || input.deliveryMethod === 'EXPRESS') &&
    input.latitude != null &&
    input.longitude != null &&
    !isInTashkentCity(input.latitude, input.longitude)
  ) {
    return apiError(
      400,
      'DELIVERY_OUT_OF_ZONE',
      'Uygacha yetkazish faqat Toshkent shahar uchun. Olib ketish punktini tanlang.',
    );
  }

  // PICKUP_POINT tanlangan bo'lsa — punkt majburiy va faol bo'lishi kerak
  let pickupPointId: string | null = null;
  if (input.deliveryMethod === 'PICKUP_POINT') {
    if (!input.pickupPointId) {
      return apiError(400, 'PICKUP_REQUIRED', 'Topshirish punktini tanlang');
    }
    const pp = await prisma.pickupPoint.findFirst({
      where: { id: input.pickupPointId, isActive: true },
      select: { id: true },
    });
    if (!pp) return apiError(400, 'PICKUP_NOT_FOUND', 'Topshirish punkti topilmadi');
    pickupPointId = pp.id;
  }

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
      // Ombor — varyant + inventar (MVP: bitta ombor, bitta inventar qatori/varyant)
      variants: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          isActive: true,
          inventory: { select: { id: true, warehouseId: true, quantityOnHand: true } },
        },
      },
    },
  });
  if (products.length !== productIds.length) {
    return apiError(400, 'PRODUCT_NOT_FOUND', "Ba'zi mahsulotlar topilmadi yoki faol emas");
  }
  const productById = new Map(products.map((p) => [p.id, p]));
  const productName = (name: unknown): string => (name as { uz?: string })?.uz ?? 'Mahsulot';

  // 2. Subtotal + varyant/ombor aniqlash (pre-check). Har bir satr uchun sotiladigan
  //    varyantni topamiz (aniq berilgan variantId yoki mahsulotning default varyanti),
  //    inventar qatorini olamiz va zaxirani tez tekshiramiz. Yakuniy (race'siz) himoya
  //    $transaction ichidagi shartli UPDATE'da (deductStockForOrder). Bu yer — tezkor javob.
  let subtotal = new Prisma.Decimal(0);
  const orderItemsData: Prisma.OrderItemUncheckedCreateWithoutOrderInput[] = [];
  const stockLines: StockLine[] = [];
  for (const it of input.items) {
    const p = productById.get(it.productId)!;

    // Varyantni aniqlash
    const variant = it.variantId
      ? p.variants.find((v) => v.id === it.variantId)
      : (p.variants.find((v) => v.isActive) ?? p.variants[0]);
    if (it.variantId && !variant) {
      return apiError(400, 'VARIANT_NOT_FOUND', 'Tanlangan variant topilmadi');
    }
    if (!variant) {
      // Inventar sozlanmagan — sotib bo'lmaydi (oversell'dan ehtiyot). Seed/backfill kerak.
      return apiError(409, 'STOCK_INSUFFICIENT', `«${productName(p.name)}» hozircha sotuvda yo'q`);
    }
    const inv = variant.inventory[0]; // MVP: bitta ombor → bitta inventar qatori
    if (!inv || inv.quantityOnHand < it.quantity) {
      return apiError(
        409,
        'STOCK_INSUFFICIENT',
        `«${productName(p.name)}» omborda yetarli emas (${inv?.quantityOnHand ?? 0} dona qoldi)`,
      );
    }

    const unitPrice = p.basePrice;
    const totalPrice = unitPrice.mul(it.quantity);
    subtotal = subtotal.add(totalPrice);
    orderItemsData.push({
      productId: p.id,
      variantId: variant.id,
      sellerId: p.sellerId ?? null,
      sku: p.sku,
      nameSnapshot: p.name as Prisma.InputJsonValue,
      quantity: it.quantity,
      unitPrice,
      taxRate: p.taxRate,
      totalPrice,
    });
    stockLines.push({
      productId: p.id,
      variantId: variant.id,
      inventoryItemId: inv.id,
      warehouseId: inv.warehouseId,
      quantity: it.quantity,
    });
  }

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
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
      },
      select: { id: true },
    });
    shippingAddressId = address.id;
  }

  // 5. Order + OrderItems + Ombor + Sello Coins (atomik $transaction)
  //    Order, ombor kamaytirish (DISPATCH), redeem (spend) va earn yozuvlari birga
  //    commit/rollback — balans va zaxira hech qachon buyurtmalar bilan nomuvofiq bo'lmaydi.
  const orderNumber = generateOrderNumber();
  const txResult = await prisma
    .$transaction(async (tx) => {
      // 5a. Promokod — TX ichida tekshirib qo'llaymiz (usedCount race'siz)
      let promoDiscount = new Prisma.Decimal(0);
      let promoApplied: string | null = null;
      let promoId: string | null = null;
      if (input.promoCode) {
        const code = input.promoCode.trim().toUpperCase();
        const promo = await tx.promoCode.findUnique({ where: { code } });
        if (promo) {
          const userUsedCount = currentUser
            ? await tx.order.count({ where: { userId: currentUser.id, promoCode: code } })
            : undefined;
          const res = evaluatePromo(promo, {
            subtotal: subtotal.toNumber(),
            shippingFee: shippingTotal.toNumber(),
            userUsedCount,
          });
          if (res.ok && res.discount > 0) {
            promoDiscount = new Prisma.Decimal(res.discount);
            promoApplied = code;
            promoId = promo.id;
          }
        }
      }
      // promokoddan keyingi qoldiq — coin redeem shu summadan oshmasin
      const afterPromo = baseTotal.sub(promoDiscount);

      // 5b. Redeem hisob-kitobi (faqat login user) — balansni TX ichida o'qib cheklaymiz
      let redeemed = 0;
      let coinDiscount = new Prisma.Decimal(0);
      if (currentUser && input.redeemCoins && input.redeemCoins > 0) {
        const u = await tx.user.findUnique({
          where: { id: currentUser.id },
          select: { loyaltyPoints: true },
        });
        const balance = u?.loyaltyPoints ?? 0;
        // chegirma summadan oshmasin (total < 0 bo'lmasin) va balansdan oshmasin
        const maxByTotal = Math.floor(afterPromo.toNumber() / COIN_VALUE_SOM);
        redeemed = Math.max(0, Math.min(input.redeemCoins, balance, maxByTotal));
        coinDiscount = new Prisma.Decimal(redeemed * COIN_VALUE_SOM);
      }
      const discount = promoDiscount.add(coinDiscount);
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
          pickupPointId,
          deliveryMethod: input.deliveryMethod,
          promoCode: promoApplied,
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

      // 5b′. Ombor — zaxirani ATOMIK kamaytirish (+ DISPATCH StockMovement).
      //      Yetmasa InsufficientStockError tashlanadi → butun tx rollback
      //      (buyurtma, coin, promo — hech biri commit bo'lmaydi). Oversell'ning oldi olinadi.
      await deductStockForOrder(tx, stockLines, orderNumber);

      // 5c. Promokod hisoblagichlari — usedCount va UserCoupon redeemedAt
      if (promoApplied && promoId) {
        await tx.promoCode.update({
          where: { id: promoId },
          data: { usedCount: { increment: 1 } },
        });
        if (currentUser) {
          await tx.userCoupon.upsert({
            where: { userId_promoCodeId: { userId: currentUser.id, promoCodeId: promoId } },
            create: { userId: currentUser.id, promoCodeId: promoId, redeemedAt: created.placedAt },
            update: { redeemedAt: created.placedAt },
          });
        }
      }

      // 5d. Sello Coins settle (earn to'langan summa bo'yicha, spend redeemed)
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

      // 5e. Offline (naqd/karta yetkazishda) to'lov — strukturaviy Payment yozuvi
      //     (PENDING). Yetkazilganda PAID bo'ladi. Onlayn (Click/Payme) uchun
      //     Payment webhook'da yaratiladi, shu bois bu yerda yaratmaymiz.
      if (!isOnlineProvider(input.paymentProvider as PaymentProvider)) {
        // Karta orqali qo'lda to'lov — chekni rawPayload'ga saqlaymiz (admin tekshiradi).
        const rawPayload =
          input.paymentProvider === MANUAL_CARD_PROVIDER
            ? {
                kind: 'MANUAL_CARD',
                receipt: input.paymentReceipt,
                note: input.paymentNote ?? null,
              }
            : undefined;
        await tx.payment.create({
          data: {
            orderId: created.id,
            provider: input.paymentProvider as PaymentProvider,
            status: 'PENDING',
            amount: grandTotal,
            currency: 'UZS',
            ...(rawPayload ? { rawPayload } : {}),
          },
        });
      }
      return {
        order: created,
        coinsEarned: earned,
        coinsRedeemed: redeemed,
        discountSom: discount.toNumber(),
        promoDiscountSom: promoDiscount.toNumber(),
        appliedPromoCode: promoApplied,
      };
    })
    .catch((e: unknown) => {
      // Ombor yetmasa — buyurtma (va barcha yon ta'sirlar) rollback bo'ladi.
      // Sentinel qaytaramiz (409 uchun); boshqa xatolar odatdagidek yuqoriga.
      if (e instanceof InsufficientStockError) return { stockError: e } as const;
      throw e;
    });

  if ('stockError' in txResult) {
    const e = txResult.stockError;
    const p = productById.get(e.productId);
    return apiError(
      409,
      'STOCK_INSUFFICIENT',
      `«${p ? productName(p.name) : 'Mahsulot'}» omborda yetarli emas (${e.available} dona qoldi)`,
    );
  }
  const { order, coinsEarned, coinsRedeemed, discountSom, promoDiscountSom, appliedPromoCode } =
    txResult;

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
      promoDiscountSom,
      appliedPromoCode,
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
      pickupPoint: {
        select: {
          id: true,
          code: true,
          name: true,
          provider: true,
          region: true,
          city: true,
          district: true,
          street: true,
          building: true,
          latitude: true,
          longitude: true,
          phone: true,
          workingHours: true,
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
      // Karta orqali qo'lda to'lov holati (chek admin tomonidan tekshirilmoqdami)
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { provider: true, status: true },
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
      // Karta orqali to'lov cheki admin tasdiqini kutmoqdami?
      paymentReview:
        o.payments[0]?.provider === 'UZCARD' &&
        o.payments[0]?.status === 'PENDING' &&
        o.status !== 'CANCELLED',
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
      pickupPoint: o.pickupPoint
        ? {
            id: o.pickupPoint.id,
            code: o.pickupPoint.code,
            name: o.pickupPoint.name,
            provider: o.pickupPoint.provider,
            region: o.pickupPoint.region,
            city: o.pickupPoint.city,
            district: o.pickupPoint.district,
            street: o.pickupPoint.street,
            building: o.pickupPoint.building,
            latitude: Number(o.pickupPoint.latitude),
            longitude: Number(o.pickupPoint.longitude),
            phone: o.pickupPoint.phone,
            workingHours: o.pickupPoint.workingHours,
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
