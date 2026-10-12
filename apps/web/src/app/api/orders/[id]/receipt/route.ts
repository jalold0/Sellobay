// POST /api/orders/[id]/receipt — admin rad etgan karta chekining o'rniga yangisini yuborish.
//
// Ilgari chek rad etilsa buyurtma PENDING'da qotardi: qayta yuborishning yo'li yo'q edi, mijozga
// xabar ham bormasdi (audit O4). Endi yangi chek alohida PENDING to'lov yozuvi bo'lib qo'shiladi
// va admin «Karta to'lovlari» navbatida qayta paydo bo'ladi. Faqat buyurtma egasi; chek avval
// /api/uploads/receipt orqali yuklanadi (`receipts/...` yo'li keladi).

import { canResubmitReceipt } from '@ecom/core-domain';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import {
  isManualCardAvailable,
  MANUAL_CARD_PROVIDER,
  parseReceipt,
  ReceiptError,
  storeReceipt,
} from '@/lib/manual-payment';
import { enforceRateLimit } from '@/lib/rate-limit';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  receipt: z.string().max(5_200_000),
  note: z.string().trim().max(300).optional().nullable(),
});

class NotResubmittableError extends Error {}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const limited = await enforceRateLimit(req, 'receipt-resubmit', { limit: 10, windowSec: 600 });
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Chekni yuklang');
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      userId: true,
      status: true,
      paidAt: true,
      grandTotal: true,
      payments: { orderBy: { createdAt: 'desc' }, select: { provider: true, status: true } },
    },
  });
  if (!order || order.userId !== user.id) return apiError(404, 'NOT_FOUND', 'Buyurtma topilmadi');
  if (!canResubmitReceipt(order)) {
    return apiError(
      409,
      'NOT_RESUBMITTABLE',
      'Bu buyurtmaga yangi chek kerak emas — to‘lov tekshiruvda, tasdiqlangan yoki buyurtma yopilgan',
    );
  }
  if (!isManualCardAvailable()) {
    return apiError(503, 'MANUAL_CARD_UNAVAILABLE', 'Karta orqali to‘lov hozir mavjud emas');
  }

  const check = parseReceipt(parsed.data.receipt);
  if (!check.ok) return apiError(400, 'RECEIPT_REQUIRED', check.error);
  let receiptPath: string;
  try {
    receiptPath = await storeReceipt(check.ref);
  } catch (e) {
    if (e instanceof ReceiptError) return apiError(400, 'RECEIPT_REQUIRED', e.message);
    throw e;
  }

  const lockKey = `receipt:${order.id}`;
  try {
    await prisma.$transaction(async (tx) => {
      // Ikki marta bosish / ikki qurilma — bitta yangi chek.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;
      const fresh = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        select: {
          status: true,
          paidAt: true,
          payments: { orderBy: { createdAt: 'desc' }, select: { provider: true, status: true } },
        },
      });
      if (!canResubmitReceipt(fresh)) throw new NotResubmittableError();

      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: MANUAL_CARD_PROVIDER,
          status: 'PENDING',
          amount: order.grandTotal,
          currency: 'UZS',
          rawPayload: { kind: 'MANUAL_CARD', receiptPath, note: parsed.data.note ?? null },
        },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: fresh.status, comment: 'Mijoz yangi chek yukladi' },
      });
    });
  } catch (e) {
    if (e instanceof NotResubmittableError) {
      return apiError(409, 'NOT_RESUBMITTABLE', 'Yangi chek allaqachon yuborilgan');
    }
    throw e;
  }

  return apiOk({ orderId: order.id, paymentReview: true });
}
