// POST /api/payments/create — buyurtma uchun to'lov checkout URL'ini qaytaradi.
// Foydalanuvchi buyurtma yaratgach (status PENDING), online to'lov uchun shu
// endpoint chaqiriladi va Click/Payme checkout sahifasiga yo'naltiriladi.

import { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { buildCheckoutUrl, isOnlineProvider, type PaymentProvider } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  orderId: z.string().uuid(),
  provider: z.enum(['CLICK', 'PAYME', 'UZUM_BANK', 'UZCARD', 'HUMO', 'CASH_ON_DELIVERY']),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', "Noto'g'ri so'rov");
  }
  const { orderId, provider } = parsed.data;

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: { id: true, number: true, grandTotal: true, status: true },
  });
  if (!order) return apiError(404, 'NOT_FOUND', 'Buyurtma topilmadi');
  if (order.status !== 'PENDING') {
    return apiError(409, 'ALREADY_PROCESSED', "Buyurtma allaqachon qayta ishlangan");
  }

  // Naqd / offline — redirect yo'q, buyurtma yetkazishda to'lanadi
  if (!isOnlineProvider(provider as PaymentProvider)) {
    return apiOk({ online: false, checkoutUrl: null });
  }

  const checkoutUrl = buildCheckoutUrl(provider as PaymentProvider, {
    id: order.id,
    amountSom: Number(order.grandTotal),
  });

  if (!checkoutUrl) {
    return apiError(400, 'UNSUPPORTED_PROVIDER', "Bu to'lov usuli qo'llab-quvvatlanmaydi");
  }

  return apiOk({ online: true, checkoutUrl });
}
