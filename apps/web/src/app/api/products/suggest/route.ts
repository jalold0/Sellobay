// Tezkor typeahead suggestion API — header'dagi qidiruv inputiga uchun
// GET /api/products/suggest?q=...  → top 6 mahsulot + categoriya bog'lanishlari

import { withApi } from '@/lib/api-handler';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// `try/catch` YO'Q: `withApi()` kutilmagan xatoni o'zi ushlaydi,
// Sentry'ga `requestId` bilan yuboradi va klientga HTML emas, JSON
// qaytaradi. Ilgari bu yerdagi `catch` xom `{ error: "..." }`
// qaytarardi — boshqa route'lardan farqli shakl.
export const GET = withApi(async (req: NextRequest) => {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return { products: [], categories: [], brands: [] };
  }

  const [products, categories, brands] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        deletedAt: null,
        OR: [
          { name: { path: ['uz'], string_contains: q } },
          { name: { path: ['ru'], string_contains: q } },
          { name: { path: ['en'], string_contains: q } },
          { sku: { contains: q, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ soldCount: 'desc' }, { rating: 'desc' }],
      take: 6,
      select: {
        id: true,
        slug: true,
        name: true,
        basePrice: true,
        brand: { select: { name: true } },
        images: {
          select: { url: true },
          take: 1,
          orderBy: { position: 'asc' },
        },
      },
    }),
    prisma.category.findMany({
      where: {
        OR: [
          { slug: { contains: q, mode: 'insensitive' } },
          { name: { path: ['uz'], string_contains: q } },
          { name: { path: ['ru'], string_contains: q } },
        ],
      },
      take: 3,
      select: { id: true, slug: true, name: true },
    }),
    prisma.brand.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      take: 3,
      select: { id: true, slug: true, name: true },
    }),
  ]);

  return {
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.basePrice.toString(),
      brand: p.brand?.name ?? null,
      imageUrl: p.images[0]?.url ?? null,
    })),
    categories,
    brands,
  };
});
