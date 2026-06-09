// Sellobay — Brendlar API
// GET /api/brands — barcha aktiv brendlar

import { NextResponse } from 'next/server';

import { prisma } from '../../../lib/db';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
      },
    });

    return NextResponse.json({ items: brands });
  } catch (err) {
    console.error('[api/brands] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
