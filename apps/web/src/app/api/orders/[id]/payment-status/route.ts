// GET /api/orders/[id]/payment-status — buyurtma to'landimi va hozir onlayn to'lash mumkinmi.
//
// NEGA KERAK: «Buyurtma qabul qilindi» sahifasi to'lov natijasini tekshirmasdi. Click/Payme
// to'lovi boshlanmasa yoki mijoz to'lov sahifasini yopib qaytsa ham «qabul qilindi» deyilardi
// va qayta to'lash tugmasi yo'q edi — mijoz to'ladim deb o'ylar, buyurtma esa to'lanmay
// muddati o'tib bekor bo'lardi (audit FUN-06).
//
// Kirish qoidasi `/api/payments/create` bilan bir xil: egasi bor buyurtmani faqat egasi
// ko'radi; mehmon buyurtmasini ID (taxmin qilib bo'lmaydigan UUID) bilan. Javob minimal —
// faqat to'lov holati, shaxsiy ma'lumot yo'q.

import { orderPaymentState } from '@ecom/core-domain';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { availableProviders, isOnlineProvider } from '@/lib/payments';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!z.string().uuid().safeParse(params.id).success) {
    return apiError(404, 'NOT_FOUND', 'Buyurtma topilmadi');
  }
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      number: true,
      status: true,
      userId: true,
      paidAt: true,
      payments: { select: { provider: true, status: true } },
    },
  });
  if (!order) return apiError(404, 'NOT_FOUND', 'Buyurtma topilmadi');
  if (order.userId) {
    const user = await getCurrentUser();
    if (!user || user.id !== order.userId) return apiError(404, 'NOT_FOUND', 'Buyurtma topilmadi');
  }

  const state = orderPaymentState(order);
  // Karta cheki admin tekshiruvida — qayta to'lash taklif qilinmaydi (ikki marta to'lanmasin).
  const receiptInReview = order.payments.some(
    (p) => p.provider === 'UZCARD' && p.status === 'PENDING',
  );
  const onlineProviders = availableProviders().filter(isOnlineProvider);
  const canPayOnline =
    state === 'AWAITING_PAYMENT' &&
    order.status === 'PENDING' &&
    !receiptInReview &&
    onlineProviders.length > 0;

  return apiOk({
    number: order.number,
    /** PAID | COD_PENDING | AWAITING_PAYMENT */
    state,
    receiptInReview,
    canPayOnline,
    onlineProviders: canPayOnline ? onlineProviders : [],
  });
}
