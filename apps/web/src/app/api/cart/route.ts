// Cart API — login bo'lgan foydalanuvchining savatchasi DB'da
// GET — joriy savatcha
// PUT { items } — to'liq sinxron (debounced lokal → server)

import { NextRequest } from 'next/server';
import { Prisma } from '@ecom/database';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findFirst({
    where: { userId, abandonedAt: null },
    orderBy: { updatedAt: 'desc' },
  });
  if (existing) return existing;
  return prisma.cart.create({ data: { userId } });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const cart = await getOrCreateCart(user.id);
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: 'asc' },
    select: {
      productId: true,
      variantId: true,
      quantity: true,
      unitPrice: true,
    },
  });

  return apiOk({
    cartId: cart.id,
    items: items.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      unitPrice: i.unitPrice.toString(),
    })),
  });
}

const syncSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional().nullable(),
        quantity: z.number().int().positive().max(999),
      }),
    )
    .max(100),
  // 'merge' — lokal va serverdagi quantity larni qo'shadi
  // 'replace' — to'liq almashtiradi
  strategy: z.enum(['merge', 'replace']).default('replace'),
});

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const parsed = syncSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const { items: clientItems, strategy } = parsed.data;

  const cart = await getOrCreateCart(user.id);

  // Mahsulotlarni DB'dan olib snapshot price tayyorlaymiz
  const productIds = Array.from(new Set(clientItems.map((i) => i.productId)));
  const products =
    productIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: productIds }, status: 'ACTIVE' },
          select: { id: true, basePrice: true },
        })
      : [];
  const priceByProduct = new Map(products.map((p) => [p.id, p.basePrice]));

  // Faqat haqiqiy mahsulotlarni qabul qilamiz
  const validClientItems = clientItems.filter((i) => priceByProduct.has(i.productId));

  if (strategy === 'merge') {
    // Mavjud server item'larni olamiz
    const existing = await prisma.cartItem.findMany({
      where: { cartId: cart.id },
    });
    const existingMap = new Map(existing.map((e) => [`${e.productId}|${e.variantId ?? ''}`, e]));

    await prisma.$transaction(async (tx) => {
      for (const it of validClientItems) {
        const key = `${it.productId}|${it.variantId ?? ''}`;
        const exists = existingMap.get(key);
        if (exists) {
          await tx.cartItem.update({
            where: { id: exists.id },
            data: { quantity: Math.min(999, exists.quantity + it.quantity) },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: cart.id,
              productId: it.productId,
              variantId: it.variantId ?? null,
              quantity: it.quantity,
              unitPrice: priceByProduct.get(it.productId)!,
            },
          });
        }
      }
    });
  } else {
    // Replace: barcha item'larni o'chirib qaytadan yaratamiz
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      if (validClientItems.length > 0) {
        await tx.cartItem.createMany({
          data: validClientItems.map((it) => ({
            cartId: cart.id,
            productId: it.productId,
            variantId: it.variantId ?? null,
            quantity: it.quantity,
            unitPrice: priceByProduct.get(it.productId) as Prisma.Decimal,
          })),
        });
      }
    });
  }

  // Yangi holatni qaytaramiz
  const finalItems = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: 'asc' },
    select: { productId: true, variantId: true, quantity: true, unitPrice: true },
  });

  return apiOk({
    cartId: cart.id,
    items: finalItems.map((i) => ({
      productId: i.productId,
      variantId: i.variantId,
      quantity: i.quantity,
      unitPrice: i.unitPrice.toString(),
    })),
  });
}
