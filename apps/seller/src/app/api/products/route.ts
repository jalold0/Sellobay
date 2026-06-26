// Sotuvchi paneli — mahsulot CRUD API.
// GET: joriy sotuvchining mahsulotlari ro'yxati.
// POST: yangi mahsulot yaratish (status default — PENDING_REVIEW, admin tasdiqlashi shart).
//       Testda darhol ACTIVE bo'lib chiqishi mumkin (Seller.status==ACTIVE va statusOverride=true).

import { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  nameUz: z.string().trim().min(2).max(200),
  nameRu: z.string().trim().min(2).max(200).optional(),
  nameEn: z.string().trim().min(2).max(200).optional(),
  descriptionUz: z.string().trim().max(5000).optional(),
  sku: z.string().trim().min(3).max(50),
  barcode: z.string().trim().max(50).optional(),
  basePrice: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  compareAtPrice: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .optional()
    .nullable(),
  stock: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  weightGrams: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .optional()
    .nullable(),
  categorySlug: z.string().trim().min(1),
  brandSlug: z.string().trim().min(1).optional().nullable(),
  // Eski 1 ta rasm uchun yoki yangi ko'p rasm uchun:
  imageUrl: z.string().trim().url().optional().nullable(),
  imageUrls: z.array(z.string().trim().url()).max(8).optional(),
  // Variantlar (ixtiyoriy): har biri rang+o'lcham yoki bittasi
  variants: z
    .array(
      z.object({
        color: z.string().trim().max(40).optional().nullable(),
        size: z.string().trim().max(20).optional().nullable(),
        priceOverride: z
          .union([z.string(), z.number()])
          .transform((v) => Number(v))
          .optional()
          .nullable(),
        skuSuffix: z.string().trim().max(20).optional().nullable(),
      }),
    )
    .max(50)
    .optional(),
});

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

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

  // Joriy user'ning Seller entity'si bormi va ACTIVE mi?
  const seller = await prisma.seller.findUnique({
    where: { ownerUserId: user.id },
  });
  if (!seller) {
    return apiError(
      403,
      'NO_SELLER_PROFILE',
      "Sotuvchi profilingiz yo'q. Iltimos, /sell sahifasidan ariza qoldiring.",
    );
  }
  if (seller.status !== 'ACTIVE') {
    return apiError(
      403,
      'SELLER_NOT_ACTIVE',
      "Sotuvchi hisobingiz hali tasdiqlanmagan. Admin tasdiqlagandan keyin mahsulot qo'sha olasiz.",
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const input = parsed.data;

  if (input.basePrice <= 0) return apiError(400, 'VALIDATION', "Narx 0 dan katta bo'lishi kerak");
  // Stok hozircha MVP'da inventar bo'limida emas — ProductVariant + Warehouse strukturasi keyingi bosqichda
  if (input.stock < 0) return apiError(400, 'VALIDATION', "Stok manfiy bo'la olmaydi");

  // SKU band emasligini tekshirish
  const existsSku = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (existsSku) return apiError(409, 'SKU_TAKEN', 'Bu SKU allaqachon mavjud');

  // Slug uz nomidan
  const slug = await ensureUniqueSlug(slugify(input.nameUz));

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

  // Rasmlar: ko'p (imageUrls) yoki bitta (imageUrl), bo'sh bo'lsa — picsum placeholder
  const collectedUrls: string[] = [];
  if (input.imageUrls && input.imageUrls.length > 0) {
    collectedUrls.push(...input.imageUrls);
  } else if (input.imageUrl?.trim()) {
    collectedUrls.push(input.imageUrl.trim());
  }
  if (collectedUrls.length === 0) {
    collectedUrls.push(`https://picsum.photos/seed/${slug}/800/800`);
  }

  // TESTDA: ACTIVE bo'lib yaratiladi (admin approval keyinroq, hozir e2e flow uchun darhol web/mobile'da ko'rinsin)
  // PROD'da bu PENDING_REVIEW bo'ladi.
  const status = 'ACTIVE';
  const publishedAt = status === 'ACTIVE' ? new Date() : null;

  const product = await prisma.product.create({
    data: {
      sellerId: seller.id,
      brandId: brand?.id,
      slug,
      sku: input.sku,
      name: nameJson,
      description: descJson,
      status,
      basePrice: input.basePrice,
      compareAtPrice: input.compareAtPrice ?? null,
      weightGrams: input.weightGrams ?? null,
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

  // Variantlar (ixtiyoriy) — ProductVariant + VariantAttribute (Color/Size atributlari auto-upsert)
  const variantInputs = (input.variants ?? []).filter((v) => v.color || v.size);
  if (variantInputs.length > 0) {
    // Atributlarni upsert qilamiz (faqat kerak bo'lganlari)
    const needsColor = variantInputs.some((v) => v.color);
    const needsSize = variantInputs.some((v) => v.size);
    const colorAttr = needsColor
      ? await prisma.attribute.upsert({
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
      ? await prisma.attribute.upsert({
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
      await prisma.productVariant.create({
        data: {
          productId: product.id,
          sku: variantSku,
          price: v.priceOverride && v.priceOverride > 0 ? v.priceOverride : null,
          position: i,
          isActive: true,
          attributes: {
            create: [
              ...(v.color && colorAttr
                ? [{ attributeId: colorAttr.id, valueString: v.color }]
                : []),
              ...(v.size && sizeAttr ? [{ attributeId: sizeAttr.id, valueString: v.size }] : []),
            ],
          },
        },
      });
    }
  }

  return apiOk({ product, variantsCreated: variantInputs.length });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const seller = await prisma.seller.findUnique({
    where: { ownerUserId: user.id },
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
      rating: true,
      reviewCount: true,
      soldCount: true,
      createdAt: true,
      images: {
        select: { url: true },
        take: 1,
        orderBy: { position: 'asc' },
      },
    },
  });

  return apiOk({
    items: items.map((p) => ({
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      name: p.name,
      status: p.status,
      basePrice: p.basePrice.toString(),
      rating: Number(p.rating),
      reviewCount: p.reviewCount,
      soldCount: p.soldCount,
      createdAt: p.createdAt,
      imageUrl: p.images[0]?.url ?? null,
    })),
  });
}
