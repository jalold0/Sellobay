// Sotuvchi arizasini rad etish: Seller PENDING → BLOCKED, sabab jurnalga yoziladi.
//
// Ilgari sabab o'qilib, tashlab yuborilardi (`void reason`) va har qanday holatdagi sotuvchini
// (faolini ham) bloklardi (audit Y3). Endi faqat kutilayotgan ariza; sabab majburiy va
// sotuvchi panelga kirmoqchi bo'lganda ko'rsatiladi.

import { z } from 'zod';

import { assertAdmin } from '@/lib/api-guard';
import { writeAudit } from '@/lib/audit';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  reason: z.string().trim().min(3, 'Rad etish sababini yozing').max(500),
});

class StateChangedError extends Error {}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId } = await assertAdmin();
  if (err) return err;

  const sellerId = params.id;
  if (!/^[a-f0-9-]{36}$/i.test(sellerId)) {
    return apiError(400, 'VALIDATION', "Sotuvchi ID noto'g'ri");
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Sababni yozing');
  }
  const { reason } = parsed.data;

  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { id: true, status: true },
  });
  if (!seller) return apiError(404, 'NOT_FOUND', 'Sotuvchi topilmadi');
  if (seller.status !== 'PENDING') {
    return apiError(
      409,
      'NOT_PENDING',
      'Faqat kutilayotgan ariza rad etiladi (faol sotuvchini «To‘xtatish» bilan to‘xtating)',
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const moved = await tx.seller.updateMany({
        where: { id: sellerId, status: 'PENDING' },
        data: { status: 'BLOCKED' },
      });
      if (moved.count === 0) throw new StateChangedError();
      await writeAudit(
        {
          userId,
          action: 'seller.reject',
          resource: 'Seller',
          resourceId: sellerId,
          meta: { reason },
        },
        tx,
      );
    });
  } catch (e) {
    if (e instanceof StateChangedError) {
      return apiError(409, 'CONCURRENT_UPDATE', 'Ariza holati boshqa jarayonda o‘zgardi');
    }
    throw e;
  }

  return apiOk({ seller: { id: sellerId, status: 'BLOCKED' } });
}
