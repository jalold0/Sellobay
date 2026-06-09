// Sellobay — Kategoriyalar API
// GET /api/categories — barcha aktiv kategoriyalar + mahsulot soni

import { NextResponse } from 'next/server';

import { prisma } from '../../../lib/db';

export const runtime = 'nodejs';
export const revalidate = 300; // 5 daq cache

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true, parentId: null }, // faqat top-level
      orderBy: { position: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        iconUrl: true,
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({
      items: categories.map((c: (typeof categories)[number]) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        iconUrl: c.iconUrl,
        productCount: c._count.products,
      })),
    });
  } catch (err) {
    console.error('[api/categories] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
