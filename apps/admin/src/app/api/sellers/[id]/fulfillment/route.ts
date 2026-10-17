// POST /api/sellers/:id/fulfillment — sotuvchining ishlash modeli (ADR 0015).
//
//   FBS — sotuvchi buyurtmani o'zi qadoqlab omborga olib keladi;
//   FBO — tovar bizning omborda, biz yig'amiz (zaxirani ombor yuritadi).
//
// Model admin tomonidan belgilanadi: FBO tovar avval omborga topshiriladi, faqat bayroq bilan
// bo'lmaydi. `applyToProducts` — mavjud tovarlar ham o'tkaziladi (aks holda faqat yangilari).
// Ochiq jo'natmalar o'z modelida qoladi — ular allaqachon yo'lda.

import { z } from 'zod';

import { requirePermission } from '@/lib/api-guard';
import { writeAudit } from '@/lib/audit';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  model: z.enum(['FBS', 'FBO']),
  applyToProducts: z.boolean(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId } = await requirePermission('sellers.manage');
  if (err) return err;

  if (!/^[a-f0-9-]{36}$/i.test(params.id)) {
    return apiError(400, 'VALIDATION', "Sotuvchi ID noto'g'ri");
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'VALIDATION', "Model noto'g'ri");
  const { model, applyToProducts } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const moved = await tx.seller.updateMany({
      where: { id: params.id },
      data: { defaultFulfillmentModel: model },
    });
    if (moved.count === 0) return null;
    const products = applyToProducts
      ? (
          await tx.product.updateMany({
            where: { sellerId: params.id, fulfillmentModel: { not: model } },
            data: { fulfillmentModel: model },
          })
        ).count
      : 0;
    await writeAudit(
      {
        userId,
        action: 'seller.fulfillment_model',
        resource: 'Seller',
        resourceId: params.id,
        meta: { model, applyToProducts, products },
      },
      tx,
    );
    return { products };
  });
  if (!result) return apiError(404, 'NOT_FOUND', 'Sotuvchi topilmadi');
  return apiOk({
    seller: { id: params.id, fulfillmentModel: model },
    productsMoved: result.products,
  });
}
