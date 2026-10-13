// POST /api/payouts/:id/paid — bank o'tkazmasi qilindi: to'lov PAID, sotuvchi daftariga
// PAYOUT (−) yozuvi (ADR 0015). `reference` — to'lov topshiriqnomasi raqami.

import { markPayoutPaid, PayoutStateError } from '@ecom/order-ops';
import { z } from 'zod';

import { assertAdmin } from '@/lib/api-guard';
import { writeAudit } from '@/lib/audit';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  reference: z.string().trim().min(2, 'To‘lov topshiriqnomasi raqamini yozing').max(100),
});

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
      await markPayoutPaid(tx, {
        payoutId: params.id,
        reference: parsed.data.reference,
        staffUserId: userId,
      });
      await writeAudit(
        {
          userId,
          action: 'payout.paid',
          resource: 'SellerPayout',
          resourceId: params.id,
          meta: { reference: parsed.data.reference },
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
  return apiOk({ payout: { id: params.id, status: 'PAID' } });
}
