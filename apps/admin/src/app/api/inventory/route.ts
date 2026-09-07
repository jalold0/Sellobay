// GET /api/inventory — platforma bo'ylab ombor holati (faqat o'qish).
//
// Zaxirani sotuvchi o'zi boshqaradi (apps/seller PATCH /api/inventory),
// admin esa umumiy manzarani ko'radi: nima tugagan, nima kam qolgan.
//
// Ilgari admin inventar sahifasi `mockProducts` ni ko'rsatardi — jami stok,
// inventar qiymati va "tugagan" soni to'qima edi.

import { assertAdmin } from '@/lib/api-guard';
import { apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Shu sondan kam qolgan tovar "quyi-stok" hisoblanadi. */
const LOW_STOCK_THRESHOLD = 10;

export async function GET() {
  const { err } = await assertAdmin();
  if (err) return err;

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: {
      id: true,
      sku: true,
      name: true,
      status: true,
      basePrice: true,
      images: { select: { url: true }, take: 1, orderBy: { position: 'asc' } },
      seller: { select: { brandName: true } },
      variants: {
        select: { inventory: { select: { quantityOnHand: true, quantityReserved: true } } },
      },
    },
  });

  const items = products.map((p) => {
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
      status: p.status,
      basePrice: Number(p.basePrice),
      imageUrl: p.images[0]?.url ?? '',
      sellerName: p.seller?.brandName ?? null,
      stock,
      reserved,
    };
  });

  const active = items.filter((i) => i.status === 'ACTIVE');
  return apiOk({
    items,
    summary: {
      totalStock: items.reduce((s, i) => s + i.stock, 0),
      // Inventar qiymati — faqat sotuvdagi tovarlar bo'yicha.
      inventoryValue: active.reduce((s, i) => s + i.stock * i.basePrice, 0),
      lowStock: active.filter((i) => i.stock > 0 && i.stock <= LOW_STOCK_THRESHOLD).length,
      outOfStock: active.filter((i) => i.stock === 0).length,
      threshold: LOW_STOCK_THRESHOLD,
    },
  });
}
