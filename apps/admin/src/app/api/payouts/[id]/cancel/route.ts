// POST /api/payouts/:id/cancel — to'lovni bekor qilish (masalan rekvizit noto'g'ri). Savdolar
// yana to'lov kutadi va keyingi hisoblashga tushadi (ADR 0015).

import { cancelPayout, PayoutStateError } from '@ecom/order-ops';
import { z } from 'zod';

import { assertAdmin } from '@/lib/api-guard';
import { writeAudit } from '@/lib/audit';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({ reason: z.string().trim().min(3, 'Sababni yozing').max(500) });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId } = await assertAdmin();
  if (err) return err;

  if (!/^[a-f0-9-]{36}$/i.test(params.id)) return apiError(400, 'VALIDATION', "ID noto'g'ri");
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri so'rov");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await cancelPayout(tx, { payoutId: params.id, reason: parsed.data.reason });
      await writeAudit(
        {
          userId,
          action: 'payout.cancel',
          resource: 'SellerPayout',
          resourceId: params.id,
          meta: { reason: parsed.data.reason },
        },
        tx,
      );
    });
  } catch (e) {
    if (e instanceof PayoutStateError) {
      return apiError(e.code === 'NOT_FOUND' ? 404 : 409, e.code, e.message);
    }
    throw e;
  }
  return apiOk({ payout: { id: params.id, status: 'CANCELLED' } });
}
