// POST /api/products/create — admin orqali mahsulot yaratish.
//
// Ilgari admin «Yangi mahsulot» formasi API'ga UMUMAN ulanmagan edi. U halol
// xatoni ko'rsatardi ("Sotuvchi paneli orqali qo'shing"), lekin sababi
// texnik edi: forma mock kategoriya/brend id'larini ishlatardi va ular
// bazadagi UUID'lar bilan mos kelmasdi. Endi forma haqiqiy
// GET /api/categories va GET /api/brands dan to'ldiriladi, shu sababli
// yaratishni ulash mumkin bo'ldi.
//
// Zaxira modeli seller POST /api/products bilan AYNAN bir xil: mahsulot
// varyant va InventoryItem'siz "sotuvda yo'q" bo'lib qoladi, chunki checkout
// faqat shu ikkisi bo'lganda sotadi (inventory-server.ts).
//
// Yo'l `/create`: `/api/products` allaqachon GET (ro'yxat) uchun band va
// unga POST qo'shish moderatsiya route'i bilan chalkashardi.

import { z } from 'zod';

import { assertAdmin, slugify } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** MVP: bitta umumiy ombor (seed va seller bilan bir xil). */
const MAIN_WAREHOUSE_CODE = 'WH-TASHKENT-MAIN';

const createSchema = z.object({
  nameUz: z.string().trim().min(2, 'Nomi kamida 2 belgi').max(200),
  nameRu: z.string().trim().max(200).optional(),
  nameEn: z.string().trim().max(200).optional(),
  descriptionUz: z.string().trim().max(5000).optional(),
  sku: z.string().trim().min(3, 'SKU kamida 3 belgi').max(50),
  slug: z.string().trim().max(120).optional(),
  basePrice: z.number().positive('Narx musbat bo`lishi kerak').max(1_000_000_000),
  compareAtPrice: z.number().positive().max(1_000_000_000).optional().nullable(),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  weightGrams: z.number().int().min(0).max(1_000_000).optional().nullable(),
  categoryId: z.string().uuid('Kategoriya tanlanmagan'),
  brandId: z.string().uuid().optional().nullable(),
  imageUrls: z.array(z.string().trim().url()).max(8).optional(),
  /** Admin yaratgan mahsulot moderatsiyani kutmaydi. */
  status: z.enum(['DRAFT', 'ACTIVE']).default('ACTIVE'),
});

export async function POST(req: NextRequest) {
  const { err, userId } = await assertAdmin();
  if (err) return err;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const input = parsed.data;

  const slug = slugify(input.slug || input.nameUz);
  if (!slug) return apiError(400, 'VALIDATION', 'Slug hosil qilib bo`lmadi — nomni tekshiring');

  // Slug va SKU UNIQUE — oldindan tekshirib tushunarli xabar beramiz
  // (aks holda mijoz xom P2002 xatosini ko'rardi).
  const [slugTaken, skuTaken] = await Promise.all([
    prisma.product.findUnique({ where: { slug }, select: { id: true } }),
    prisma.product.findUnique({ where: { sku: input.sku }, select: { id: true } }),
  ]);
  if (slugTaken) return apiError(409, 'SLUG_TAKEN', `«${slug}» slug'i band`);
  if (skuTaken) return apiError(409, 'SKU_TAKEN', `«${input.sku}» SKU'si band`);

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) return apiError(400, 'CATEGORY_NOT_FOUND', 'Kategoriya topilmadi');

  if (input.brandId) {
    const brand = await prisma.brand.findUnique({
      where: { id: input.brandId },
      select: { id: true },
    });
    if (!brand) return apiError(400, 'BRAND_NOT_FOUND', 'Brend topilmadi');
  }

  const nameJson = {
    uz: input.nameUz,
    ru: input.nameRu || input.nameUz,
    en: input.nameEn || input.nameUz,
  };

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        // sellerId null — bu platforma mahsuloti (sotuvchiga tegishli emas).
        brandId: input.brandId ?? null,
        slug,
        sku: input.sku,
        name: nameJson,
        description: input.descriptionUz
          ? { uz: input.descriptionUz, ru: input.descriptionUz, en: input.descriptionUz }
          : { uz: '', ru: '', en: '' },
        status: input.status,
        basePrice: input.basePrice,
        compareAtPrice: input.compareAtPrice ?? null,
        weightGrams: input.weightGrams ?? null,
        publishedAt: input.status === 'ACTIVE' ? new Date() : null,
        categories: { create: [{ categoryId: category.id }] },
        images: {
          create: (input.imageUrls ?? []).map((url, idx) => ({
            url,
            alt: nameJson,
            position: idx,
            isPrimary: idx === 0,
          })),
        },
      },
      select: { id: true, slug: true, sku: true, status: true },
    });

    const warehouse = await tx.warehouse.upsert({
      where: { code: MAIN_WAREHOUSE_CODE },
      update: {},
      create: {
        code: MAIN_WAREHOUSE_CODE,
        name: 'Tashkent Main Warehouse',
        address: "Yangihayot tumani, Sanoat ko'chasi 12",
        city: 'Tashkent',
        region: 'Tashkent',
      },
      select: { id: true },
    });

    // Default variant + inventar. Busiz mahsulot katalogda ko'rinadi-yu,
    // checkout uni "sotuvda yo'q" deb rad etadi.
    const variant = await tx.productVariant.create({
      data: { productId: created.id, sku: input.sku, position: 0, isActive: true },
      select: { id: true },
    });
    await tx.inventoryItem.create({
      data: {
        warehouseId: warehouse.id,
        variantId: variant.id,
        locationId: null,
        quantityOnHand: input.stock,
      },
    });
    if (input.stock > 0) {
      await tx.stockMovement.create({
        data: {
          warehouseId: warehouse.id,
          variantId: variant.id,
          type: 'RECEIVING',
          quantity: input.stock,
          reference: created.sku,
          reason: 'ADMIN_PRODUCT_CREATED',
          performedBy: userId,
        },
      });
    }

    return created;
  });

  return apiOk({ product });
}
