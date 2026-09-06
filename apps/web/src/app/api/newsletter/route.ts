// POST /api/newsletter — footer'dagi obuna formasi shu yerga yozadi.
//
// Ilgari forma serverga UMUMAN murojaat qilmasdi: 600ms kutib, "Rahmat!
// Email tasdiqlandi" xabarini chiqarardi va emailni tashlab yuborardi.
// Mijoz obuna bo'ldim deb o'ylardi, ro'yxat esa yig'ilmasdi.

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/rate-limit';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  locale: z.enum(['uz', 'ru', 'en']).optional(),
  source: z.string().trim().max(40).optional(),
});

export async function POST(req: NextRequest) {
  // Auth talab qilinmaydi (mehmon ham obuna bo'ladi), shu sababli IP bo'yicha
  // cheklov shart — aks holda ro'yxatni bir necha daqiqada axlatga to'ldirish
  // mumkin bo'lardi.
  const limited = await enforceRateLimit(req, 'newsletter', { limit: 5, windowSec: 300 });
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'VALIDATION', "Email noto'g'ri");

  const { email, locale, source } = parsed.data;

  try {
    // Takroriy obuna XATO EMAS: mijoz ikkinchi marta yuborsa ham "qabul
    // qilindi" ko'rishi kerak. Ilgari bekor qilgan bo'lsa — obuna tiklanadi.
    await prisma.newsletterSubscriber.upsert({
      where: { email },
      create: { email, locale: locale ?? null, source: source ?? null },
      update: { unsubscribedAt: null, locale: locale ?? undefined },
    });
  } catch (err) {
    // Migratsiya hali qo'llanmagan bo'lsa jadval mavjud emas. Bu holatda
    // ushlanmagan 500 (stack trace Sentry'ga) o'rniga toza 503 qaytaramiz —
    // klient esa xato xabarini ko'rsatadi, JIM MUVAFFAQIYAT emas.
    console.error('[api/newsletter] yozib bo`lmadi:', err);
    return apiError(503, 'UNAVAILABLE', "Obuna vaqtincha ishlamayapti. Keyinroq urinib ko'ring.");
  }

  return apiOk({ subscribed: true });
}
