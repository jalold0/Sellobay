// Sotuvchi paneli — ombor (inventar) API.
//   GET   /api/inventory — joriy sotuvchining tovarlari, HAR VARIANT alohida qator
//   PATCH /api/inventory — variantlar zaxirasini yangilash
//
// Zaxira modeli @ecom/order-ops inventory bilan bir xil: InventoryItem VARIANT bo'yicha
// kalitlanadi, MVP'da bitta ombor (WH-TASHKENT-MAIN).
//
// Audit O3 tuzatishlari:
//   • ko'p variantli tovar ham tahrirlanadi — har variant o'z qatori;
//   • yozish SHARTLI: sotuvchi ko'rgan qiymat (`expected`) hali o'sha bo'lsagina. Ilgari mutlaq
//     qiymat lock'siz yozilardi — shu orada tushgan buyurtma kamaytirgan zaxira jimgina qayta
//     «tiklanib», oversell bo'lardi;
//   • «kam qoldi» chegarasi — variantning `reorderPoint` qiymati (ilgari qattiq 10).

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { requireSeller } from '@/lib/seller-access';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAIN_WAREHOUSE_CODE = 'WH-TASHKENT-MAIN';
/** reorderPoint qo'yilmagan (0) eski qatorlar uchun — yaratishdagi standart bilan bir xil. */
const DEFAULT_REORDER_POINT = 10;

const patchSchema = z.object({
  updates: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        // Yakuniy zaxira (ayirma emas) — sahifada sotuvchi aniq sonni kiritadi.
        quantity: z.number().int().min(0).max(1_000_000),
        // Sotuvchi sahifada ko'rgan qiymat — shu orada o'zgargan bo'lsa yozilmaydi.
        expected: z.number().int().min(0),
      }),
    )
    .min(1, "Hech bo'lmaganda bitta qator kerak")
    .max(500),
});

class StockChangedError extends Error {
  constructor(readonly skus: string[]) {
    super('STOCK_CHANGED');
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const { seller, err } = await requireSeller(user.id, 'read');
  if (err) return apiOk({ items: [] });

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
        orderBy: { position: 'asc' },
        select: {
          id: true,
          sku: true,
          price: true,
          attributes: { select: { valueString: true } },
          inventory: {
            where: { warehouse: { code: MAIN_WAREHOUSE_CODE } },
            select: { quantityOnHand: true, quantityReserved: true, reorderPoint: true },
          },
        },
      },
    },
  });

  return apiOk({
    items: products.flatMap((p) =>
      p.variants.map((v) => {
        const inv = v.inventory[0];
        const label = v.attributes
          .map((a) => a.valueString)
          .filter((x): x is string => Boolean(x))
          .join(' / ');
        return {
          variantId: v.id,
          productId: p.id,
          sku: v.sku,
          name: p.name,
          // Bir variantli tovarda yorliq bo'sh — qator tovarning o'zi.
          variantLabel: p.variants.length > 1 ? label || v.sku : null,
          price: Number(v.price ?? p.basePrice),
          imageUrl: p.images[0]?.url ?? '',
          stock: inv?.quantityOnHand ?? 0,
          reserved: inv?.quantityReserved ?? 0,
          reorderPoint: inv?.reorderPoint || DEFAULT_REORDER_POINT,
        };
      }),
    ),
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  // Zaxirani faqat FAOL sotuvchi o'zgartiradi (audit Y4).
  const { seller, err } = await requireSeller(user.id, 'write');
  if (err) return err;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const { updates } = parsed.data;

  const ids = new Set(updates.map((u) => u.variantId));
  if (ids.size !== updates.length) {
    return apiError(400, 'VALIDATION', 'Bitta variant ro`yxatda ikki marta kelgan');
  }

  // MUHIM: faqat SHU sotuvchining variantlari (IDOR).
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...ids] }, product: { sellerId: seller.id, deletedAt: null } },
    select: { id: true, sku: true },
  });
  if (variants.length !== ids.size) {
    return apiError(403, 'FORBIDDEN', 'Ro`yxatda sizga tegishli bo`lmagan tovar bor');
  }
  const skuById = new Map(variants.map((v) => [v.id, v.sku]));

  const warehouse = await prisma.warehouse.findUnique({
    where: { code: MAIN_WAREHOUSE_CODE },
    select: { id: true },
  });
  if (!warehouse) {
    return apiError(
      503,
      'WAREHOUSE_MISSING',
      'Ombor sozlanmagan — administratorga murojaat qiling',
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const changed: string[] = [];
      let count = 0;
      for (const u of updates) {
        if (u.quantity === u.expected) continue;
        const sku = skuById.get(u.variantId)!;
        const existing = await tx.inventoryItem.findFirst({
          where: { variantId: u.variantId, warehouseId: warehouse.id },
          select: { id: true },
        });
        if (existing) {
          // SHARTLI yozuv: zaxira hali sotuvchi ko'rgan qiymatda bo'lsagina.
          const res = await tx.inventoryItem.updateMany({
            where: { id: existing.id, quantityOnHand: u.expected },
            data: { quantityOnHand: u.quantity },
          });
          if (res.count === 0) {
            changed.push(sku);
            continue;
          }
        } else {
          if (u.expected !== 0) {
            changed.push(sku);
            continue;
          }
          await tx.inventoryItem.create({
            data: {
              warehouseId: warehouse.id,
              variantId: u.variantId,
              locationId: null,
              quantityOnHand: u.quantity,
              reorderPoint: DEFAULT_REORDER_POINT,
            },
          });
        }
        // Audit izi — kim, qachon, qanchaga o'zgartirdi.
        await tx.stockMovement.create({
          data: {
            warehouseId: warehouse.id,
            variantId: u.variantId,
            type: 'ADJUSTMENT',
            quantity: u.quantity - u.expected,
            reference: sku,
            reason: 'SELLER_MANUAL_ADJUSTMENT',
            performedBy: user.id,
          },
        });
        count++;
      }
      // Hammasi yoki hech biri: aralash holat sotuvchini chalg'itardi.
      if (changed.length > 0) throw new StockChangedError(changed);
      return count;
    });
    return apiOk({ updated });
  } catch (e) {
    if (e instanceof StockChangedError) {
      return apiError(
        409,
        'STOCK_CHANGED',
        `Shu orada zaxira o‘zgardi (buyurtma tushgan bo‘lishi mumkin): ${e.skus.join(', ')}. Yangi qiymatlarni ko‘rib, qayta saqlang.`,
      );
    }
    throw e;
  }
}
