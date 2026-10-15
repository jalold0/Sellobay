// Sotuvchi paneli — mahsulot CRUD API.
// GET: joriy sotuvchining mahsulotlari ro'yxati.
// POST: yangi mahsulot yaratish (status default — PENDING_REVIEW, admin tasdiqlashi shart).
//       Testda darhol ACTIVE bo'lib chiqishi mumkin (Seller.status==ACTIVE va statusOverride=true).

import { isValidCompareAtPrice, normalizeProductSpecs, readProductSpecs } from '@ecom/core-domain';
import { Prisma } from '@ecom/database';
import { isOwnPublicImageUrl } from '@ecom/storage';
import { slugify } from '@ecom/utils';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { moneySchema, optionalMoneySchema } from '@/lib/product-input';
import { lastProductModerationNotes } from '@/lib/product-moderation';
import { requireSeller } from '@/lib/seller-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z
  .object({
    nameUz: z.string().trim().min(2).max(200),
    nameRu: z.string().trim().min(2).max(200).optional(),
    nameEn: z.string().trim().min(2).max(200).optional(),
    descriptionUz: z.string().trim().max(5000).optional(),
    sku: z.string().trim().min(3).max(50),
    barcode: z.string().trim().max(50).optional(),
    // Pul — o'nlik SATR (Decimal ustuniga to'g'ridan-to'g'ri), NaN/Infinity/manfiy o'tmaydi (audit Y15).
    basePrice: moneySchema,
    compareAtPrice: optionalMoneySchema,
    stock: z.coerce.number().int('Zaxira butun son bo‘lishi kerak').min(0).max(1_000_000),
    weightGrams: z.coerce.number().int().min(0).max(1_000_000).optional().nullable(),
    // Xususiyatlar (material, tarkib...) — @ecom/core-domain normalizeProductSpecs tekshiradi.
    specs: z.unknown().optional(),
    categorySlug: z.string().trim().min(1),
    brandSlug: z.string().trim().min(1).optional().nullable(),
    // Eski 1 ta rasm uchun yoki yangi ko'p rasm uchun:
    // Faqat panel orqali yuklangan rasm (bizning Blob do'konimiz) — tashqi URL emas (audit O10).
    imageUrl: z
      .string()
      .trim()
      .url()
      .refine(
        isOwnPublicImageUrl,
        "Rasmni «Rasm yuklash» tugmasi orqali qo'shing (tashqi havola qabul qilinmaydi)",
      )
      .optional()
      .nullable(),
    imageUrls: z
      .array(
        z
          .string()
          .trim()
          .url()
          .refine(
            isOwnPublicImageUrl,
            "Rasmni «Rasm yuklash» tugmasi orqali qo'shing (tashqi havola qabul qilinmaydi)",
          ),
      )
      .max(8)
      .optional(),
    // Variantlar (ixtiyoriy): har biri rang+o'lcham yoki bittasi
    variants: z
      .array(
        z.object({
          color: z.string().trim().max(40).optional().nullable(),
          size: z.string().trim().max(20).optional().nullable(),
          priceOverride: optionalMoneySchema,
          // Har bir variant o'z zaxirasiga ega — inventar variant bo'yicha kalitlanadi.
          stock: z.coerce.number().int().min(0).max(1_000_000).optional().nullable(),
          skuSuffix: z.string().trim().max(20).optional().nullable(),
        }),
      )
      .max(50)
      .optional(),
  })
  .refine((v) => isValidCompareAtPrice(v.basePrice, v.compareAtPrice), {
    message: 'Eski narx yangi narxdan katta bo‘lishi kerak',
    path: ['compareAtPrice'],
  });

// MVP: bitta umumiy ombor (seed va inventory-server bilan bir xil).
const MAIN_WAREHOUSE_CODE = 'WH-TASHKENT-MAIN';

async function ensureUniqueSlug(base: string): Promise<string> {
  const root = base || `product-${Date.now()}`;
  let slug = root;
  let i = 1;
  while (await prisma.product.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${root}-${i++}`;
    if (i > 50) {
      slug = `${root}-${Date.now()}`;
      break;
    }
  }
  return slug;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  // Faqat FAOL sotuvchi (kutilayotgan/to'xtatilgan — yo'q).
  const { seller, err } = await requireSeller(user.id, 'write');
  if (err) return err;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const input = parsed.data;
  const specs = normalizeProductSpecs(input.specs);
  if (!specs.ok) return apiError(400, 'VALIDATION', specs.error);

  const { defaultFulfillmentModel: sellerModel } = await prisma.seller.findUniqueOrThrow({
    where: { id: seller.id },
    select: { defaultFulfillmentModel: true },
  });

  // SKU band emasligini tekshirish
  const existsSku = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (existsSku) return apiError(409, 'SKU_TAKEN', 'Bu SKU allaqachon mavjud');

  // Slug uz nomidan
  const slug = await ensureUniqueSlug(slugify(input.nameUz).slice(0, 80));

  // Kategoriya
  const category = await prisma.category.findUnique({ where: { slug: input.categorySlug } });
  if (!category) return apiError(400, 'VALIDATION', 'Tanlangan kategoriya topilmadi');

  // Brand (ixtiyoriy)
  const brand = input.brandSlug
    ? await prisma.brand.findUnique({ where: { slug: input.brandSlug } })
    : null;
  if (input.brandSlug && !brand) {
    return apiError(400, 'VALIDATION', 'Tanlangan brend topilmadi');
  }

  // Tarjima JSON
  const nameJson = {
    uz: input.nameUz,
    ru: input.nameRu ?? input.nameUz,
    en: input.nameEn ?? input.nameUz,
  };
  const descJson = {
    uz: input.descriptionUz ?? '',
    ru: input.descriptionUz ?? '',
    en: input.descriptionUz ?? '',
  };

  // Rasmlar: ko'p (imageUrls) yoki bitta (imageUrl).
  //
  // Rasm berilmasa BAZAGA HECH NARSA YOZILMAYDI. Ilgari bu yerda
  // `picsum.photos/seed/...` manzili saqlanardi — u tasodifiy foto qaytaradigan
  // tashqi xizmat, ya'ni bazaga mahsulotga aloqasi yo'q rasm yozib qo'yardi va
  // xizmat ishlamay qolsa mahsulot rasmsiz qolardi. Endi rasmsiz mahsulotni
  // interfeys o'zi placeholder bilan ko'rsatadi (@ecom/utils).
  const collectedUrls: string[] = [];
  if (input.imageUrls && input.imageUrls.length > 0) {
    collectedUrls.push(...input.imageUrls);
  } else if (input.imageUrl?.trim()) {
    collectedUrls.push(input.imageUrl.trim());
  }

  // Moderatsiya: PROD'da yangi mahsulot admin tasdiqini kutadi (PENDING_REVIEW) —
  // admin panelidan Tasdiqlash bosilgach ACTIVE bo'lib web/mobile'da ko'rinadi.
  // Dev/test'da (yoki SELLER_PRODUCT_AUTOAPPROVE=true) darhol ACTIVE — e2e oqim uchun.
  const autoApprove =
    process.env.SELLER_PRODUCT_AUTOAPPROVE === 'true' || process.env.NODE_ENV !== 'production';
  const status = autoApprove ? 'ACTIVE' : 'PENDING_REVIEW';
  const publishedAt = status === 'ACTIVE' ? new Date() : null;

  // Ixtiyoriy variantlar (rang/o'lcham). Yo'q bo'lsa — bitta "default" variant beramiz.
  const variantInputs = (input.variants ?? []).filter((v) => v.color || v.size);
  // Shtrix-kod variantga tegishli (ProductVariant.barcode). Ilgari qabul qilinib, jimgina
  // tashlab yuborilardi (audit O10). Variantli tovarda har variantning o'z kodi bo'ladi.
  const barcode = input.barcode?.trim() || null;
  if (barcode && variantInputs.length > 0) {
    return apiError(
      400,
      'VALIDATION',
      'Variantli tovarda shtrix-kod har variant uchun alohida — hozircha uni bo‘sh qoldiring',
    );
  }

  // Mahsulot + rasmlar + variant(lar) + ombor zaxirasi — hammasi ATOMIK ($transaction).
  // Sabab: web/mobile checkout mahsulotni FAQAT varyant + InventoryItem (quantityOnHand>0)
  // bo'lganda sotadi (inventory-server.ts). Variant/inventarsiz mahsulot "sotuvda yo'q"
  // bo'lib qoladi. Seed'dagi pattern bilan bir xil: default varyant → WH-TASHKENT-MAIN →
  // InventoryItem → RECEIVING StockMovement.
  let txResult;
  try {
    txResult = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          sellerId: seller.id,
          // Model sotuvchiniki (admin belgilaydi) — FBO bo'lsa tovar omborimizga topshiriladi.
          fulfillmentModel: sellerModel,
          brandId: brand?.id,
          slug,
          sku: input.sku,
          name: nameJson,
          description: descJson,
          status,
          basePrice: input.basePrice,
          compareAtPrice: input.compareAtPrice ?? null,
          weightGrams: input.weightGrams ?? null,
          ...(specs.specs.length > 0
            ? { specs: specs.specs as unknown as Prisma.InputJsonValue }
            : {}),
          publishedAt,
          categories: {
            create: [{ categoryId: category.id }],
          },
          images: {
            create: collectedUrls.map((url, idx) => ({
              url,
              alt: {
                uz: input.nameUz,
                ru: input.nameRu ?? input.nameUz,
                en: input.nameEn ?? input.nameUz,
              },
              position: idx,
              isPrimary: idx === 0,
            })),
          },
        },
        select: { id: true, slug: true, sku: true, status: true },
      });

      // Ombor (idempotent, seed bilan bir xil kod)
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

      // Variant uchun inventar qatori + (zaxira>0 bo'lsa) RECEIVING harakati.
      const stockVariant = async (variantId: string, qty: number) => {
        await tx.inventoryItem.create({
          data: {
            warehouseId: warehouse.id,
            variantId,
            quantityOnHand: qty,
            quantityReserved: 0,
            reorderPoint: 10,
          },
        });
        if (qty > 0) {
          await tx.stockMovement.create({
            data: {
              warehouseId: warehouse.id,
              variantId,
              type: 'RECEIVING',
              quantity: qty,
              reason: 'seller:initial-stock',
            },
          });
        }
      };

      if (variantInputs.length > 0) {
        // Atributlarni upsert qilamiz (faqat kerak bo'lganlari)
        const needsColor = variantInputs.some((v) => v.color);
        const needsSize = variantInputs.some((v) => v.size);
        const colorAttr = needsColor
          ? await tx.attribute.upsert({
              where: { slug: 'color' },
              update: {},
              create: {
                slug: 'color',
                name: { uz: 'Rang', ru: 'Цвет', en: 'Color' },
                type: 'color',
                isVariant: true,
              },
            })
          : null;
        const sizeAttr = needsSize
          ? await tx.attribute.upsert({
              where: { slug: 'size' },
              update: {},
              create: {
                slug: 'size',
                name: { uz: "O'lcham", ru: 'Размер', en: 'Size' },
                type: 'size',
                isVariant: true,
              },
            })
          : null;

        for (let i = 0; i < variantInputs.length; i++) {
          const v = variantInputs[i]!;
          const suffix =
            v.skuSuffix?.trim() ||
            [v.color, v.size].filter(Boolean).join('-').toUpperCase() ||
            String(i + 1);
          const variantSku = `${input.sku}-${slugify(suffix)}`;
          const variant = await tx.productVariant.create({
            data: {
              productId: created.id,
              sku: variantSku,
              price: v.priceOverride ?? null,
              position: i,
              isActive: true,
              attributes: {
                create: [
                  ...(v.color && colorAttr
                    ? [{ attributeId: colorAttr.id, valueString: v.color }]
                    : []),
                  ...(v.size && sizeAttr
                    ? [{ attributeId: sizeAttr.id, valueString: v.size }]
                    : []),
                ],
              },
            },
            select: { id: true },
          });
          await stockVariant(variant.id, v.stock ?? 0);
        }
      } else {
        // Varyant berilmagan — mahsulot uchun bitta "default" varyant + zaxira.
        const variant = await tx.productVariant.create({
          data: { productId: created.id, sku: input.sku, barcode, position: 0, isActive: true },
          select: { id: true },
        });
        await stockVariant(variant.id, input.stock);
      }

      return { product: created, variantsCreated: variantInputs.length };
    });
  } catch (e) {
    // Variant SKU (`${sku}-${suffix}`) globally @unique — bir xil rang/o'lcham yoki mavjud SKU
    // bilan to'qnashuv P2002 beradi. Umumiy 500 o'rniga tushunarli 409 qaytaramiz.
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === 'P2002' &&
      String(e.meta?.target ?? '').includes('barcode')
    ) {
      return apiError(409, 'BARCODE_TAKEN', 'Bu shtrix-kod boshqa tovarda ishlatilgan');
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return apiError(
        409,
        'VARIANT_SKU_TAKEN',
        "Variant SKU takrorlanmoqda yoki band — variantlar rang/o'lchamini yoki SKU qo'shimchasini o'zgartiring",
      );
    }
    throw e;
  }

  const { product, variantsCreated } = txResult;
  return apiOk({ product, variantsCreated });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const seller = await prisma.seller.findUnique({
    where: { ownerUserId: user.id },
    select: { id: true },
  });
  if (!seller) return apiOk({ items: [] });

  const items = await prisma.product.findMany({
    where: { sellerId: seller.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      slug: true,
      sku: true,
      name: true,
      status: true,
      basePrice: true,
      compareAtPrice: true,
      description: true,
      specs: true,
      fulfillmentModel: true,
      rating: true,
      reviewCount: true,
      soldCount: true,
      createdAt: true,
      images: {
        select: { url: true },
        take: 1,
        orderBy: { position: 'asc' },
      },
      variants: {
        select: { inventory: { select: { quantityOnHand: true, reorderPoint: true } } },
      },
    },
  });

  // Rad etilgan / sotuvdan olingan tovar yonida admin sababi ko'rinadi (audit Y1, Y13).
  const notes = await lastProductModerationNotes(
    items.filter((p) => p.status === 'DRAFT' || p.status === 'ARCHIVED').map((p) => p.id),
  );

  return apiOk({
    items: items.map((p) => ({
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      name: p.name,
      description: p.description,
      specs: readProductSpecs(p.specs),
      status: p.status,
      basePrice: Number(p.basePrice),
      compareAtPrice: p.compareAtPrice !== null ? Number(p.compareAtPrice) : null,
      moderationNote: notes.get(p.id) ?? null,
      fulfillmentModel: p.fulfillmentModel,
      rating: Number(p.rating),
      reviewCount: p.reviewCount,
      soldCount: p.soldCount,
      stock: p.variants.reduce(
        (sum, v) => sum + v.inventory.reduce((s, inv) => s + inv.quantityOnHand, 0),
        0,
      ),
      // Biror varianti o'z chegarasidan (reorderPoint; qo'yilmagan bo'lsa 10) kam qolgan.
      lowStock: p.variants.some((v) =>
        v.inventory.some((inv) => inv.quantityOnHand <= (inv.reorderPoint || 10)),
      ),
      createdAt: p.createdAt,
      imageUrl: p.images[0]?.url ?? '',
    })),
  });
}
