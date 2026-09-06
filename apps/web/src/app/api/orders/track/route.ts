import { normalizeUzPhone } from '@ecom/utils';
import { NextRequest } from 'next/server';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Buyurtmani raqam + telefon bo'yicha kuzatish (ochiq endpoint).
 *
 * Nega telefon SHART:
 * Buyurtma raqami ketma-ket (ORD-2026-00001234), ya'ni faqat raqam bo'yicha
 * qidirish begona odamga birma-bir sanab chiqish imkonini berardi. Telefon
 * qo'shilishi bilan "topish" uchun ikkala ma'lumot ham kerak bo'ladi.
 *
 * Nega mehmon (guest) uchun kerak:
 * Checkout login talab qilmaydi — mijoz telefon bilan ham buyurtma bera oladi
 * (Order.guestPhone). Bunday mijozda kabinet yo'q, demak buyurtmasini
 * kuzatishning boshqa yo'li yo'q.
 *
 * Javobda ATAYLAB minimal ma'lumot: holat, vaqt chizig'i, summa va yetkazish
 * usuli. Manzil, ism, to'lov tafsilotlari BERILMAYDI — ular kabinetda,
 * to'liq autentifikatsiyadan keyin ko'rinadi.
 */
const schema = z.object({
  number: z
    .string()
    .trim()
    .min(4)
    .max(40)
    .transform((v) => v.toUpperCase()),
  phone: z.string().trim().min(7).max(20),
});

export async function POST(req: NextRequest) {
  // Sanab chiqishga qarshi: bitta IP'dan daqiqasiga 10 urinish
  const limited = await enforceRateLimit(req, 'order-track', { limit: 10, windowSec: 60 });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }

  const phone = normalizeUzPhone(parsed.data.phone);
  if (!phone) return apiError(400, 'VALIDATION', "Telefon raqami noto'g'ri");

  const order = await prisma.order.findUnique({
    where: { number: parsed.data.number },
    select: {
      number: true,
      status: true,
      placedAt: true,
      grandTotal: true,
      currency: true,
      deliveryMethod: true,
      guestPhone: true,
      user: { select: { phone: true } },
      items: { select: { id: true } },
      statusHistory: {
        orderBy: { changedAt: 'asc' },
        select: { status: true, changedAt: true },
      },
    },
  });

  // Topilmadi va telefon mos emas — BIR XIL javob. Aks holda javob farqi
  // "bu raqam mavjud, faqat telefon xato" degan ma'lumotni oshkor qilardi.
  // Eski qatorlar normallashtirilmagan holda saqlangan ('+998 956859995' kabi),
  // shuning uchun bazadagi qiymatni ham solishtirishdan oldin normallashtiramiz.
  const stored = [order?.guestPhone, order?.user?.phone]
    .filter((v): v is string => Boolean(v))
    .map((v) => normalizeUzPhone(v) ?? v);
  const phoneMatches = stored.includes(phone);
  if (!order || !phoneMatches) {
    return apiError(404, 'NOT_FOUND', 'Bunday buyurtma topilmadi');
  }

  return apiOk({
    order: {
      number: order.number,
      status: order.status,
      placedAt: order.placedAt.toISOString(),
      total: order.grandTotal.toString(),
      currency: order.currency,
      deliveryMethod: order.deliveryMethod,
      itemCount: order.items.length,
      timeline: order.statusHistory.map((h) => ({
        status: h.status,
        at: h.changedAt.toISOString(),
      })),
    },
  });
}
