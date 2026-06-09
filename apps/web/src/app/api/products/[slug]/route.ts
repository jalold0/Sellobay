// Sellobay — Bitta mahsulot API
// GET /api/products/[slug] — slug bo'yicha to'liq mahsulot

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '../../../../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
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
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Decimal va boshqa types'ni JSON-friendly qilish
    return NextResponse.json({
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
      categories: product.categories.map((c) => c.category),
    });
  } catch (err) {
    console.error('[api/products/[slug]] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
