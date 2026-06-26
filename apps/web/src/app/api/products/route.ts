// Sellobay — Mahsulotlar API
// GET /api/products[?category=...&brand=...&featured=true&ids=uuid1,uuid2&limit=20&page=1]

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '../../../lib/db';

export const runtime = 'nodejs'; // Prisma edge'da hali to'liq qo'llab-quvvatlanmaydi
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const category = url.searchParams.get('category');
  const brand = url.searchParams.get('brand');
  const featured = url.searchParams.get('featured');
  const idsParam = url.searchParams.get('ids');
  const q = url.searchParams.get('q')?.trim() ?? '';
  const sort = url.searchParams.get('sort') ?? 'newest';
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 24), 100);
  const page = Math.max(Number(url.searchParams.get('page') ?? 1), 1);

  // Aniq ID'lar bo'yicha so'rov (wishlist, recent viewed, etc.)
  const ids = idsParam
    ? idsParam
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^[a-f0-9-]{36}$/i.test(s)) // UUID validation
    : null;

  try {
    const where: any = {
      status: 'ACTIVE',
      deletedAt: null,
    };
    if (ids && ids.length > 0) where.id = { in: ids };
    if (featured === 'true') where.isFeatured = true;
    if (brand) where.brand = { slug: brand };
    if (category) {
      where.categories = { some: { category: { slug: category } } };
    }
    // Qidiruv: name JSON (uz/ru/en) yoki SKU bo'yicha ILIKE
    if (q.length >= 2) {
      where.OR = [
        { name: { path: ['uz'], string_contains: q } },
        { name: { path: ['ru'], string_contains: q } },
        { name: { path: ['en'], string_contains: q } },
        { sku: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy: any =
      sort === 'price-asc'
        ? { basePrice: 'asc' }
        : sort === 'price-desc'
          ? { basePrice: 'desc' }
          : sort === 'popular'
            ? { soldCount: 'desc' }
            : sort === 'rating'
              ? { rating: 'desc' }
              : { publishedAt: 'desc' };

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          slug: true,
          sku: true,
          name: true,
          basePrice: true,
          compareAtPrice: true,
          currency: true,
          rating: true,
          reviewCount: true,
          soldCount: true,
          isFeatured: true,
          publishedAt: true,
          brand: { select: { id: true, slug: true, name: true } },
          images: {
            select: { url: true, alt: true },
            orderBy: { position: 'asc' },
            take: 1,
          },
          categories: {
            select: { category: { select: { slug: true, name: true } } },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Decimal → string (JSON serializatsiya uchun)
    const serialized = items.map((p: (typeof items)[number]) => ({
      id: p.id,
      slug: p.slug,
      sku: p.sku,
      name: p.name,
      price: p.basePrice.toString(),
      oldPrice: p.compareAtPrice?.toString() ?? null,
      currency: p.currency,
      rating: Number(p.rating),
      reviewCount: p.reviewCount,
      soldCount: p.soldCount,
      isFeatured: p.isFeatured,
      brand: p.brand,
      imageUrl: p.images[0]?.url ?? null,
      category: p.categories[0]?.category ?? null,
    }));

    return NextResponse.json({
      items: serialized,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (err) {
    console.error('[api/products] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
