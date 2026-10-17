// PATCH /api/products/[id] — mahsulot moderatsiyasi (admin).
//   action=approve  → PENDING_REVIEW → ACTIVE (+ publishedAt) — web/mobile'da ko'rinadi
//   action=reject   → PENDING_REVIEW → DRAFT, sabab majburiy — sotuvchi tuzatib qayta yuboradi
//   action=takedown → ACTIVE/OUT_OF_STOCK → ARCHIVED, sabab majburiy — sotuvdan olish
//
// Ilgari sotuvdagi tovarni olib bo'lmasdi, rad etish sababi esa umuman saqlanmasdi (audit Y1).
// Sabab `AuditLog` ga yoziladi va sotuvchi panelida tovar yonida ko'rsatiladi (Y13).

import { z } from 'zod';

import { requirePermission } from '@/lib/api-guard';
import { writeAudit } from '@/lib/audit';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { ProductStatus } from '@ecom/database';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const reason = z.string().trim().min(3, 'Sababni yozing').max(500);
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve') }),
  z.object({ action: z.literal('reject'), reason }),
  z.object({ action: z.literal('takedown'), reason }),
]);

const RULES: Record<
  z.infer<typeof schema>['action'],
  {
    from: ProductStatus[];
    to: ProductStatus;
    audit: 'product.approve' | 'product.reject' | 'product.takedown';
    wrongState: string;
  }
> = {
  approve: {
    from: ['PENDING_REVIEW'],
    to: 'ACTIVE',
    audit: 'product.approve',
    wrongState: 'Faqat tekshiruvdagi (PENDING_REVIEW) mahsulotni tasdiqlash mumkin',
  },
  reject: {
    from: ['PENDING_REVIEW'],
    to: 'DRAFT',
    audit: 'product.reject',
    wrongState: 'Faqat tekshiruvdagi (PENDING_REVIEW) mahsulotni rad etish mumkin',
  },
  takedown: {
    from: ['ACTIVE', 'OUT_OF_STOCK'],
    to: 'ARCHIVED',
    audit: 'product.takedown',
    wrongState: 'Faqat sotuvdagi mahsulotni sotuvdan olish mumkin',
  },
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId } = await requirePermission('catalog.manage');
  if (err) return err;

  const productId = params.id;
  if (!/^[a-f0-9-]{36}$/i.test(productId)) {
    return apiError(400, 'VALIDATION', "Mahsulot ID noto'g'ri");
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri so'rov");
  }
  const input = parsed.data;
  const rule = RULES[input.action];

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, status: true, publishedAt: true },
  });
  if (!product) return apiError(404, 'NOT_FOUND', 'Mahsulot topilmadi');
  if (!rule.from.includes(product.status)) {
    return apiError(409, 'INVALID_STATE', rule.wrongState);
  }

  const done = await prisma.$transaction(async (tx) => {
    // ATOMIK: faqat o'qilgan holatdan (ikki admin bir vaqtda bossa — ikkinchisi 409).
    const moved = await tx.product.updateMany({
      where: { id: productId, status: product.status },
      data: {
        status: rule.to,
        ...(rule.to === 'ACTIVE' ? { publishedAt: product.publishedAt ?? new Date() } : {}),
      },
    });
    if (moved.count === 0) return false;
    await writeAudit(
      {
        userId,
        action: rule.audit,
        resource: 'Product',
        resourceId: productId,
        meta: {
          from: product.status,
          to: rule.to,
          reason: 'reason' in input ? input.reason : null,
        },
      },
      tx,
    );
    return true;
  });
  if (!done) {
    return apiError(409, 'CONCURRENT_UPDATE', 'Mahsulot holati boshqa jarayonda o‘zgardi');
  }

  return apiOk({ product: { id: productId, status: rule.to } });
}
