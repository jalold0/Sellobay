// Sotuvchi paneli — ombor (inventar) API.
//   GET   /api/inventory — joriy sotuvchining mahsulotlari va ularning zaxirasi
//   PATCH /api/inventory — bir nechta mahsulot zaxirasini yangilash
//
// Ilgari sotuvchi inventar sahifasi mock ro'yxatni ko'rsatib, "Saqlash" bosilganda
// faqat "Stok yangilandi" toast'ini chiqarardi — hech qanday so'rov ketmasdi va
// bazada hech nima o'zgarmasdi. Sotuvchi tugagan tovarni "bor" deb qoldirsa,
// sayt uni sotishda davom etardi (oversell).
//
// Zaxira modeli apps/web/src/lib/inventory-server.ts bilan bir xil:
// InventoryItem VARIANT bo'yicha kalitlanadi, mahsulot zaxirasi = variantlar
// yig'indisi, MVP'da bitta ombor (WH-TASHKENT-MAIN).

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAIN_WAREHOUSE_CODE = 'WH-TASHKENT-MAIN';

const patchSchema = z.object({
  updates: z
    .array(
      z.object({
        productId: z.string().uuid(),
        // Yakuniy zaxira (ayirma emas) — sahifada sotuvchi aniq sonni kiritadi.
        quantity: z.number().int().min(0).max(1_000_000),
      }),
    )
    .min(1, "Hech bo'lmaganda bitta mahsulot kerak")
    .max(200),
});

/** Joriy foydalanuvchining sotuvchi profili. Yo'q bo'lsa null. */
async function currentSeller(userId: string) {
  return prisma.seller.findUnique({ where: { ownerUserId: userId }, select: { id: true } });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const seller = await currentSeller(user.id);
  if (!seller) return apiOk({ items: [] });

  const products = await prisma.product.findMany({
    where: { sellerId: seller.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      sku: true,
      name: true,
      basePrice: true,
      images: { select: { url: true }, take: 1, orderBy: { position: 'asc' } },
      variants: {
        select: {
          id: true,
          inventory: { select: { quantityOnHand: true, quantityReserved: true } },
        },
      },
    },
  });

  return apiOk({
    items: products.map((p) => {
      const stock = p.variants.reduce(
        (sum, v) => sum + v.inventory.reduce((s, inv) => s + inv.quantityOnHand, 0),
        0,
      );
      const reserved = p.variants.reduce(
        (sum, v) => sum + v.inventory.reduce((s, inv) => s + inv.quantityReserved, 0),
        0,
      );
      return {
        id: p.id,
        sku: p.sku,
        name: p.name,
        basePrice: Number(p.basePrice),
        imageUrl: p.images[0]?.url ?? '',
        stock,
        reserved,
        // Bir nechta variantli mahsulotda umumiy sonni bitta qiymatga
        // yozib bo'lmaydi — bunday qatorlar UI'da tahrirlanmaydi.
        variantCount: p.variants.length,
        editable: p.variants.length === 1,
      };
    }),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const seller = await currentSeller(user.id);
  if (!seller) return apiError(403, 'NOT_A_SELLER', "Sotuvchi profili topilmadi");

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const { updates } = parsed.data;

  // Bir mahsulot ikki marta kelmasin — aks holda oxirgisi jim g'olib bo'lardi.
  const seen = new Set<string>();
  for (const u of updates) {
    if (seen.has(u.productId)) {
      return apiError(400, 'VALIDATION', 'Bitta mahsulot ro`yxatda ikki marta kelgan');
    }
    seen.add(u.productId);
  }

  // MUHIM: faqat SHU sotuvchining mahsulotlari. Aks holda sotuvchi boshqa
  // sotuvchining zaxirasini o'zgartira olardi (IDOR).
  const products = await prisma.product.findMany({
    where: { id: { in: [...seen] }, sellerId: seller.id, deletedAt: null },
    select: { id: true, sku: true, variants: { select: { id: true } } },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const foreign = [...seen].filter((id) => !byId.has(id));
  if (foreign.length > 0) {
    return apiError(403, 'FORBIDDEN', "Ro`yxatda sizga tegishli bo`lmagan mahsulot bor");
  }

  const warehouse = await prisma.warehouse.findUnique({
    where: { code: MAIN_WAREHOUSE_CODE },
    select: { id: true },
  });
  if (!warehouse) {
    return apiError(503, 'WAREHOUSE_MISSING', 'Ombor sozlanmagan — administratorga murojaat qiling');
  }

  const skipped: string[] = [];
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const u of updates) {
      const product = byId.get(u.productId)!;

      // Ko'p variantli mahsulotda umumiy sonni bitta qiymatga yozib bo'lmaydi —
      // qaysi variantga tegishli ekani noma'lum. Jim o'zgartirmaymiz.
      if (product.variants.length !== 1) {
        skipped.push(product.sku);
        continue;
      }
      const variantId = product.variants[0]!.id;

      const existing = await tx.inventoryItem.findFirst({
        where: { variantId, warehouseId: warehouse.id },
        select: { id: true, quantityOnHand: true },
      });

      const before = existing?.quantityOnHand ?? 0;
      const delta = u.quantity - before;
      if (delta === 0) continue;

      if (existing) {
        await tx.inventoryItem.update({
          where: { id: existing.id },
          data: { quantityOnHand: u.quantity },
        });
      } else {
        await tx.inventoryItem.create({
          data: {
            warehouseId: warehouse.id,
            variantId,
            locationId: null,
            quantityOnHand: u.quantity,
          },
        });
      }

      // Audit izi — kim, qachon, qanchaga o'zgartirdi. Zaxira tarixisiz
      // kelishmovchilikni keyin tekshirib bo'lmaydi.
      await tx.stockMovement.create({
        data: {
          warehouseId: warehouse.id,
          variantId,
          type: 'ADJUSTMENT',
          quantity: delta,
          reference: product.sku,
          reason: 'SELLER_MANUAL_ADJUSTMENT',
          performedBy: user.id,
        },
      });
      updated++;
    }
  });

  return apiOk({ updated, skipped });
}
