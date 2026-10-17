// Faol sotuvchini to'xtatish (ACTIVE → SUSPENDED) yoki qayta yoqish (SUSPENDED → ACTIVE).
//
// Ilgari faol sotuvchini to'xtatishning yo'li yo'q edi. To'xtatilgan sotuvchining tovarlari
// vitrinadan darhol yo'qoladi (web `SELLER_IS_ACTIVE`), u panelga kira oladi, lekin tovar
// qo'sha/o'zgartira olmaydi (audit Y2, Y4).

import { z } from 'zod';

import { requirePermission } from '@/lib/api-guard';
import { writeAudit } from '@/lib/audit';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('suspend'),
    reason: z.string().trim().min(3, 'To‘xtatish sababini yozing').max(500),
  }),
  z.object({ action: z.literal('reactivate'), reason: z.string().trim().max(500).optional() }),
]);

const TRANSITION = {
  suspend: { from: 'ACTIVE', to: 'SUSPENDED', audit: 'seller.suspend' },
  reactivate: { from: 'SUSPENDED', to: 'ACTIVE', audit: 'seller.reactivate' },
} as const;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId } = await requirePermission('sellers.manage');
  if (err) return err;

  const sellerId = params.id;
  if (!/^[a-f0-9-]{36}$/i.test(sellerId)) {
    return apiError(400, 'VALIDATION', "Sotuvchi ID noto'g'ri");
  }
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri so'rov");
  }
  const t = TRANSITION[parsed.data.action];

  const done = await prisma.$transaction(async (tx) => {
    const moved = await tx.seller.updateMany({
      where: { id: sellerId, status: t.from },
      data: { status: t.to },
    });
    if (moved.count === 0) return false;
    await writeAudit(
      {
        userId,
        action: t.audit,
        resource: 'Seller',
        resourceId: sellerId,
        meta: { reason: parsed.data.reason ?? null },
      },
      tx,
    );
    return true;
  });
  if (!done) {
    const exists = await prisma.seller.count({ where: { id: sellerId } });
    if (!exists) return apiError(404, 'NOT_FOUND', 'Sotuvchi topilmadi');
    return apiError(
      409,
      'INVALID_TRANSITION',
      parsed.data.action === 'suspend'
        ? 'Faqat faol sotuvchini to‘xtatish mumkin'
        : 'Faqat to‘xtatilgan sotuvchini qayta yoqish mumkin',
    );
  }
  return apiOk({ seller: { id: sellerId, status: t.to } });
}
