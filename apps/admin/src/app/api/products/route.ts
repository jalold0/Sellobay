// GET /api/products — barcha mahsulotlar (admin, hamma status). Faqat ADMIN/SUPER_ADMIN.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user) return { err: apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan') };
  const allowed = ['ADMIN', 'SUPER_ADMIN'];
  if (!user.roles?.some((r) => allowed.includes(r))) {
    return { err: apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)") };
  }
  return { err: null };
}

export async function GET() {
  const { err } = await assertAdmin();
  if (err) return err;

  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: {
      id: true,
      sku: true,
      slug: true,
      name: true,
      status: true,
      basePrice: true,
      compareAtPrice: true,
      soldCount: true,
      rating: true,
      reviewCount: true,
      createdAt: true,
      brand: { select: { name: true } },
      seller: { select: { brandName: true } },
      images: { take: 1, orderBy: { position: 'asc' }, select: { url: true } },
      categories: { take: 1, select: { category: { select: { name: true } } } },
      variants: { select: { inventory: { select: { quantityOnHand: true } } } },
    },
  });

  const items = products.map((p) => {
    const stock = p.variants.reduce(
      (sum, v) => sum + v.inventory.reduce((s, inv) => s + inv.quantityOnHand, 0),
      0,
    );
    return {
      id: p.id,
      sku: p.sku,
      slug: p.slug,
      name: p.name,
      brandName: p.brand?.name ?? '—',
      categoryName: p.categories[0]?.category?.name ?? { uz: '—', ru: '—', en: '—' },
      status: p.status,
      basePrice: Number(p.basePrice),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
      imageUrl: p.images[0]?.url ?? '',
      stock,
      soldCount: p.soldCount,
      rating: Number(p.rating),
      reviewCount: p.reviewCount,
      sellerName: p.seller?.brandName ?? undefined,
      createdAt: p.createdAt.toISOString(),
    };
  });

  return apiOk({ items });
}
