// GET  /api/categories — kategoriyalar daraxti (mahsulot soni bilan)
// POST /api/categories — yangi kategoriya (ixtiyoriy ota-kategoriya bilan)
//
// Ilgari admin kategoriyalar sahifasi `mockCategories` ni ko'rsatardi va
// "Yangi kategoriya" / "Qo'shish" tugmalari onClick'siz edi. Ortida route
// umuman yo'q edi.

import { z } from 'zod';

import { assertAdmin, slugify } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Nom uch tilda saqlanadi (Category.name — Json). */
const localizedName = z.object({
  uz: z.string().trim().min(2, 'O`zbekcha nom kamida 2 belgi').max(80),
  ru: z.string().trim().max(80).optional(),
  en: z.string().trim().max(80).optional(),
});

const createSchema = z.object({
  name: localizedName,
  slug: z.string().trim().max(80).optional(),
  parentId: z.string().uuid().optional().nullable(),
  position: z.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const { err } = await assertAdmin();
  if (err) return err;

  const categories = await prisma.category.findMany({
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    take: 500,
    select: {
      id: true,
      parentId: true,
      slug: true,
      name: true,
      iconUrl: true,
      position: true,
      isActive: true,
      _count: { select: { products: true, children: true } },
    },
  });

  return apiOk({
    items: categories.map((c) => ({
      id: c.id,
      parentId: c.parentId,
      slug: c.slug,
      name: c.name,
      iconUrl: c.iconUrl,
      position: c.position,
      isActive: c.isActive,
      productsCount: c._count.products,
      childrenCount: c._count.children,
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

  const slug = slugify(input.slug || input.name.uz);
  if (!slug) return apiError(400, 'VALIDATION', 'Slug hosil qilib bo`lmadi — nomni tekshiring');

  const exists = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (exists) return apiError(409, 'SLUG_TAKEN', `«${slug}» slug'i band`);

  // Ota-kategoriya berilgan bo'lsa — mavjudligini tekshiramiz, aks holda
  // Prisma xom foreign key xatosi beradi.
  if (input.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: input.parentId },
      select: { id: true },
    });
    if (!parent) return apiError(400, 'PARENT_NOT_FOUND', 'Ota-kategoriya topilmadi');
  }

  const category = await prisma.category.create({
    data: {
      slug,
      name: input.name,
      parentId: input.parentId ?? null,
      position: input.position,
      isActive: input.isActive,
    },
    select: {
      id: true,
      parentId: true,
      slug: true,
      name: true,
      iconUrl: true,
      position: true,
      isActive: true,
    },
  });

  return apiOk({ category: { ...category, productsCount: 0, childrenCount: 0 } });
}
