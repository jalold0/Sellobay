// PATCH /api/products/[id] — mahsulot moderatsiyasi (admin).
//   action=approve → status ACTIVE (+ publishedAt) — web/mobile'da ko'rinadi
//   action=reject  → status DRAFT — sotuvchiga qaytadi, saytda ko'rinmaydi
// Faqat PENDING_REVIEW holatidagi mahsulotlar moderatsiya qilinadi.

import { NextRequest } from 'next/server';

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { err } = await assertAdmin();
  if (err) return err;

  const productId = params.id;
  if (!/^[a-f0-9-]{36}$/i.test(productId)) {
    return apiError(400, 'VALIDATION', "Mahsulot ID noto'g'ri");
  }

  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action;
  if (action !== 'approve' && action !== 'reject') {
    return apiError(400, 'VALIDATION', "action 'approve' yoki 'reject' bo'lishi kerak");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, status: true, publishedAt: true },
  });
  if (!product) return apiError(404, 'NOT_FOUND', 'Mahsulot topilmadi');
  if (product.status !== 'PENDING_REVIEW') {
    return apiError(
      409,
      'NOT_PENDING',
      'Faqat tekshiruvdagi (PENDING_REVIEW) mahsulotni moderatsiya qilish mumkin',
    );
  }

  const updated = await prisma.product.update({
    where: { id: productId },
    data:
      action === 'approve'
        ? { status: 'ACTIVE', publishedAt: product.publishedAt ?? new Date() }
        : { status: 'DRAFT' },
    select: { id: true, status: true, publishedAt: true },
  });

  return apiOk({ product: updated });
}
