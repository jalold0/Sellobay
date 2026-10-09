// Sellobay — Bitta mahsulot API
// GET /api/products/[slug] — slug bo'yicha to'liq mahsulot

import { ApiDomainError } from '@ecom/api-contract';

import { withApi } from '@/lib/api-handler';

import { prisma } from '../../../../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// `try/catch` YO'Q: `withApi()` kutilmagan xatoni o'zi ushlaydi,
// Sentry'ga `requestId` bilan yuboradi va klientga HTML emas, JSON
// qaytaradi. Ilgari bu yerdagi `catch` xom `{ error: "..." }`
// qaytarardi — boshqa route'lardan farqli shakl.
export const GET = withApi<{ slug: string }>(async (_req, { params }) => {
  const product = await prisma.product.findFirst({
    where: {
      slug: params.slug,
      status: 'ACTIVE',
      deletedAt: null,
    },
    include: {
      brand: { select: { id: true, slug: true, name: true, logoUrl: true } },
      seller: { select: { id: true, brandName: true, rating: true } },
      images: { orderBy: { position: 'asc' } },
      categories: {
        include: { category: { select: { slug: true, name: true } } },
      },
      // Ombor: zaxira = varyantlar inventarining yig'indisi.
      // Variantning O'ZI ham qaytariladi: mijoz rang/o'lchamni tanlaganda
      // klient aynan qaysi variantni buyurtma qilishini bilishi kerak.
      // Ilgari bu yerda faqat `inventory` bor edi — natijada mobil ilova
      // rang va o'lcham ro'yxatini KODGA YOZIB QO'YGAN edi (bazadagi
      // haqiqiy variantlarga aloqasi yo'q) va buyurtma har doim standart
      // variantga tushardi, ya'ni boshqa variantning zaxirasi kamayardi.
      variants: {
        where: { isActive: true },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          sku: true,
          price: true,
          position: true,
          inventory: { select: { quantityOnHand: true } },
          attributes: {
            select: {
              valueString: true,
              attribute: { select: { slug: true } },
            },
          },
        },
      },
    },
  });

  if (!product) {
    throw new ApiDomainError(404, 'NOT_FOUND', 'Mahsulot topilmadi');
  }

  const stock = product.variants.reduce(
    (sum, v) => sum + v.inventory.reduce((s, inv) => s + inv.quantityOnHand, 0),
    0,
  );

  /** Atribut qiymatini oladi (option bo'lsa undan, aks holda valueString'dan). */
  const attrValue = (
    attrs: (typeof product.variants)[number]['attributes'],
    slug: string,
  ): string | null => {
    const found = attrs.find((a) => a.attribute.slug === slug);
    return found?.valueString ?? null;
  };

  const variants = product.variants.map((v) => {
    const variantStock = v.inventory.reduce((s, inv) => s + inv.quantityOnHand, 0);
    return {
      id: v.id,
      sku: v.sku,
      // Variant o'z narxiga ega bo'lmasa mahsulotning asosiy narxi.
      price: (v.price ?? product.basePrice).toString(),
      color: attrValue(v.attributes, 'color'),
      size: attrValue(v.attributes, 'size'),
      stock: variantStock,
      inStock: variantStock > 0,
    };
  });

  // Decimal va boshqa types'ni JSON-friendly qilish
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    description: product.description,
    shortDescription: product.shortDescription,
    price: product.basePrice.toString(),
    oldPrice: product.compareAtPrice?.toString() ?? null,
    currency: product.currency,
    rating: Number(product.rating),
    reviewCount: product.reviewCount,
    soldCount: product.soldCount,
    isFeatured: product.isFeatured,
    publishedAt: product.publishedAt,
    brand: product.brand,
    seller: product.seller ? { ...product.seller, rating: Number(product.seller.rating) } : null,
    images: product.images,
    categories: product.categories.map((c: (typeof product.categories)[number]) => c.category),
    stock,
    inStock: stock > 0,
    variants,
  };
});
