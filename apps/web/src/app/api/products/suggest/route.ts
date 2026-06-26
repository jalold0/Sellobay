// Tezkor typeahead suggestion API — header'dagi qidiruv inputiga uchun
// GET /api/products/suggest?q=...  → top 6 mahsulot + categoriya bog'lanishlari

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ products: [], categories: [], brands: [] });
  }

  try {
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

    return NextResponse.json({
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
    });
  } catch (err) {
    console.error('[api/products/suggest] error:', err);
    return NextResponse.json({ products: [], categories: [], brands: [] }, { status: 500 });
  }
}
