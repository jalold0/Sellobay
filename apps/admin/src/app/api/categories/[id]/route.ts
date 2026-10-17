// PATCH /api/categories/[id] — kategoriyani tahrirlash
//
// Nom, bo'lim (ota-kategoriya), tartib, ikonka va faollik. Slug
// o'zgartirilmaydi: u havolalarda (/catalog?category=...) va mobil
// ilovada ishlatiladi — almashsa eski havolalar bo'sh natija beradi.

import { wouldCreateCycle } from '@ecom/core-domain';
import { z } from 'zod';

import { requirePermission } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import { categoryIconUrl, localizedName } from '../schema';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const patchSchema = z
  .object({
    name: localizedName.optional(),
    parentId: z.string().uuid().nullable().optional(),
    position: z.number().int().min(0).max(9999).optional(),
    isActive: z.boolean().optional(),
    iconUrl: categoryIconUrl.optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "O'zgartirish yo'q");

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { err } = await requirePermission('catalog.manage');
  if (err) return err;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const input = parsed.data;

  const current = await prisma.category.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!current) return apiError(404, 'NOT_FOUND', 'Kategoriya topilmadi');

  if (input.parentId !== undefined && input.parentId !== null) {
    const links = await prisma.category.findMany({ select: { id: true, parentId: true } });
    if (!links.some((l) => l.id === input.parentId)) {
      return apiError(400, 'PARENT_NOT_FOUND', 'Ota-kategoriya topilmadi');
    }
    if (wouldCreateCycle(links, params.id, input.parentId)) {
      return apiError(
        400,
        'PARENT_CYCLE',
        'Kategoriyani o`zining yoki o`z ichki turining ichiga ko`chirib bo`lmaydi',
      );
    }
  }

  const category = await prisma.category.update({
    where: { id: params.id },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      ...(input.position !== undefined ? { position: input.position } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.iconUrl !== undefined ? { iconUrl: input.iconUrl || null } : {}),
    },
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

  const { _count, ...rest } = category;
  return apiOk({
    category: { ...rest, productsCount: _count.products, childrenCount: _count.children },
  });
}
