// POST /api/orders/[id]/refund — mijozga qaytarilgan pulni qayd etish (admin).
// Pul o'zi qo'lda qaytariladi (Click/Payme kabineti, karta, naqd); bu yerda summa, usul va
// kim qaytargani yoziladi. To'liq qaytsa buyurtma REFUNDED, mijozga push ketadi.

import { parseMoneyInput } from '@ecom/core-domain';
import { getPushService } from '@ecom/push';
import { z } from 'zod';

import { assertAdmin } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { recordRefund, REFUND_METHODS, RefundError, type RefundMethod } from '@/lib/refund-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  amount: z.union([z.string(), z.number()]),
  method: z.enum(Object.keys(REFUND_METHODS) as [RefundMethod, ...RefundMethod[]]),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId } = await assertAdmin();
  if (err) return err;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri so'rov");
  }
  const amount = parseMoneyInput(parsed.data.amount);
  if (!amount) return apiError(400, 'VALIDATION', 'Summani to‘g‘ri kiriting (masalan 125000)');

  try {
    const result = await recordRefund({
      orderId: params.id,
      adminUserId: userId,
      amount,
      method: parsed.data.method,
      reference: parsed.data.reference || undefined,
      note: parsed.data.note || undefined,
    });
    // Push COMMIT'DAN KEYIN; xato tashlamaydi.
    if (result.fullyRefunded) await getPushService().notifyOrderStatus(result.id, 'REFUNDED');
    return apiOk(result);
  } catch (e) {
    if (e instanceof RefundError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
