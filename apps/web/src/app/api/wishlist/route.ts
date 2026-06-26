// Wishlist API — login bo'lgan foydalanuvchining sevimlilari DB'da saqlanadi
// GET — ro'yxat
// POST { productId } — qo'shish
// DELETE ?productId=... — o'chirish
// PUT { productIds } — to'liq almashtirish (login paytida lokal → server sinxron)

import { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { productId: true, createdAt: true },
  });

  return apiOk({
    productIds: items.map((i) => i.productId),
    count: items.length,
  });
}

const addSchema = z.object({ productId: z.string().uuid() });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'VALIDATION', "Noto'g'ri ma'lumot");

  // Mahsulot mavjudligi
  const product = await prisma.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, status: true },
  });
  if (!product || product.status !== 'ACTIVE') {
    return apiError(404, 'PRODUCT_NOT_FOUND', 'Mahsulot topilmadi');
  }

  // Upsert (mavjud bo'lsa hech narsa qilmaymiz)
  await prisma.wishlistItem.upsert({
    where: {
      userId_productId: { userId: user.id, productId: parsed.data.productId },
    },
    update: {},
    create: { userId: user.id, productId: parsed.data.productId },
  });

  return apiOk({ added: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const productId = new URL(req.url).searchParams.get('productId');
  if (!productId) return apiError(400, 'VALIDATION', 'productId kerak');

  await prisma.wishlistItem.deleteMany({
    where: { userId: user.id, productId },
  });

  return apiOk({ removed: true });
}

const syncSchema = z.object({
  productIds: z.array(z.string().uuid()).max(500),
});

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const parsed = syncSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'VALIDATION', "Noto'g'ri ma'lumot");

  // Lokal va server'dagi ID'larni birlashtirib union qilamiz (lokal'ni o'chirib tashlamaymiz)
  const localIds = parsed.data.productIds;

  // Faqat mavjud mahsulotlarni qoldiramiz
  const valid = await prisma.product.findMany({
    where: { id: { in: localIds }, status: 'ACTIVE' },
    select: { id: true },
  });
  const validIds = new Set(valid.map((p) => p.id));

  // Existing on server
  const existing = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    select: { productId: true },
  });
  const existingIds = new Set(existing.map((i) => i.productId));

  // Add (in local, not in server)
  const toAdd = Array.from(validIds).filter((id) => !existingIds.has(id));
  if (toAdd.length > 0) {
    await prisma.wishlistItem.createMany({
      data: toAdd.map((productId) => ({ userId: user.id, productId })),
      skipDuplicates: true,
    });
  }

  // Yangi to'liq ro'yxatni qaytaramiz
  const finalItems = await prisma.wishlistItem.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { productId: true },
  });

  return apiOk({
    productIds: finalItems.map((i) => i.productId),
    merged: toAdd.length,
  });
}
