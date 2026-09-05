// GET  /api/brands — brendlar ro'yxati (mahsulot soni bilan)
// POST /api/brands — yangi brend
//
// Ilgari admin brendlar sahifasi `mockBrands` ni ko'rsatardi va "Yangi brend"
// tugmasi onClick'siz edi — bosilganda hech nima bo'lmasdi, sabab ham
// aytilmasdi. Ortida route umuman yo'q edi.

import { z } from 'zod';

import { assertAdmin, slugify } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  name: z.string().trim().min(2, 'Brend nomi kamida 2 belgi').max(80),
  /** Berilmasa nomdan hosil qilinadi. */
  slug: z.string().trim().max(80).optional(),
  logoUrl: z.string().trim().url('Logo manzili noto`g`ri').max(500).optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const { err } = await assertAdmin();
  if (err) return err;

  const brands = await prisma.brand.findMany({
    orderBy: { name: 'asc' },
    take: 500,
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      isActive: true,
      createdAt: true,
      _count: { select: { products: true } },
    },
  });

  return apiOk({
    items: brands.map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      logoUrl: b.logoUrl,
      isActive: b.isActive,
      productsCount: b._count.products,
      createdAt: b.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { err } = await assertAdmin();
  if (err) return err;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const input = parsed.data;
  const slug = slugify(input.slug || input.name);
  if (!slug) return apiError(400, 'VALIDATION', 'Slug hosil qilib bo`lmadi — nomni tekshiring');

  const exists = await prisma.brand.findUnique({ where: { slug }, select: { id: true } });
  if (exists) return apiError(409, 'SLUG_TAKEN', `«${slug}» slug'i band`);

  const brand = await prisma.brand.create({
    data: {
      slug,
      name: input.name,
      logoUrl: input.logoUrl ?? null,
      isActive: input.isActive,
    },
    select: { id: true, slug: true, name: true, logoUrl: true, isActive: true, createdAt: true },
  });

  return apiOk({
    brand: { ...brand, productsCount: 0, createdAt: brand.createdAt.toISOString() },
  });
}
