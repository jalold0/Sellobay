// GET  /api/group-buy — guruh xaridlari ro'yxati (admin)
// POST /api/group-buy — yangi guruh xaridi ochish
//
// Auditda topilgan bo'shliq: guruh xaridi backend'i (model, API, sahifa)
// qurilgan edi, lekin guruhni YARATADIGAN yo'l faqat seed'da bor edi.
// Ya'ni production'da /group-buy sahifasi abadiy bo'sh qolardi, holbuki
// bosh sahifa banneri va footer unga havola berardi.

import { z } from 'zod';

import { assertAdmin } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAY_MS = 24 * 60 * 60 * 1000;

const createSchema = z.object({
  productId: z.string().uuid('Mahsulot tanlanmagan'),
  /** Guruh narxi so'mda. Katalog narxidan past bo'lishi tekshiriladi. */
  groupPrice: z.number().positive().max(1_000_000_000),
  targetSize: z.number().int().min(2, 'Kamida 2 kishi').max(1000),
  /** Necha kun davom etadi. */
  durationDays: z.number().int().min(1).max(60),
});

export async function GET() {
  const { err } = await assertAdmin();
  if (err) return err;

  const rows = await prisma.groupBuy.findMany({
    orderBy: [{ status: 'asc' }, { expiresAt: 'asc' }],
    take: 200,
    select: {
      id: true,
      soloPrice: true,
      groupPrice: true,
      targetSize: true,
      status: true,
      expiresAt: true,
      completedAt: true,
      createdAt: true,
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          images: { select: { url: true }, take: 1, orderBy: { position: 'asc' } },
        },
      },
      _count: { select: { members: true } },
    },
  });

  return apiOk({
    items: rows.map((r) => ({
      id: r.id,
      productId: r.product.id,
      productSlug: r.product.slug,
      name: r.product.name,
      imageUrl: r.product.images[0]?.url ?? '',
      soloPrice: Number(r.soloPrice),
      groupPrice: Number(r.groupPrice),
      targetSize: r.targetSize,
      currentSize: r._count.members,
      status: r.status,
      expiresAt: r.expiresAt.toISOString(),
      completedAt: r.completedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
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

  const product = await prisma.product.findFirst({
    where: { id: input.productId, status: 'ACTIVE', deletedAt: null },
    select: { id: true, basePrice: true },
  });
  if (!product) return apiError(404, 'PRODUCT_NOT_FOUND', 'Mahsulot topilmadi yoki sotuvda emas');

  const soloPrice = Number(product.basePrice);
  // Guruh narxi katalog narxidan past bo'lishi SHART — aks holda mijozga
  // "chegirma" deb ko'rsatilgan narx aslida chegirma bo'lmaydi.
  if (input.groupPrice >= soloPrice) {
    return apiError(
      400,
      'PRICE_NOT_LOWER',
      `Guruh narxi katalog narxidan (${soloPrice}) past bo'lishi kerak`,
    );
  }

  // Bir mahsulot uchun bir vaqtda faqat bitta OCHIQ guruh — aks holda mijoz
  // qaysi guruhga qo'shilishini bilmaydi va narx tanlash chalkashadi.
  const open = await prisma.groupBuy.findFirst({
    where: { productId: product.id, status: 'OPEN' },
    select: { id: true },
  });
  if (open) {
    return apiError(409, 'ALREADY_OPEN', 'Bu mahsulot uchun ochiq guruh allaqachon bor');
  }

  const created = await prisma.groupBuy.create({
    data: {
      productId: product.id,
      // Narx SNAPSHOT: guruh ochilgandagi katalog narxi saqlanadi.
      soloPrice: product.basePrice,
      groupPrice: input.groupPrice,
      targetSize: input.targetSize,
      expiresAt: new Date(Date.now() + input.durationDays * DAY_MS),
    },
    select: { id: true, expiresAt: true },
  });

  return apiOk({ groupBuy: { id: created.id, expiresAt: created.expiresAt.toISOString() } });
}
