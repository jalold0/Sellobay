// GET  /api/promo-codes — promokodlar ro'yxati
// POST /api/promo-codes — yangi promokod
//
// Ilgari admin marketing sahifasi `mockPromoCodes` ni ko'rsatardi va "Yangi
// kampaniya" tugmasi onClick'siz edi. Ayni paytda promokod mexanizmi
// (evaluatePromo, /api/promo/validate, checkout) to'liq ishlaydi — faqat
// kod YARATADIGAN yo'l yo'q edi, ya'ni kodlar qo'lda bazaga yozilishi
// kerak bo'lardi.

import { z } from 'zod';

import { assertAdmin } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Kod kamida 3 belgi')
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, 'Kodda faqat harf, raqam, - va _ bo`lishi mumkin'),
    type: z.enum(['PERCENT', 'FIXED', 'FREE_SHIPPING']),
    value: z.number().min(0).max(100_000_000),
    minOrderTotal: z.number().min(0).max(1_000_000_000).optional().nullable(),
    maxDiscount: z.number().min(0).max(1_000_000_000).optional().nullable(),
    usageLimit: z.number().int().min(1).max(1_000_000).optional().nullable(),
    usagePerUser: z.number().int().min(1).max(1000).default(1),
    startsAt: z.string().datetime().optional().nullable(),
    endsAt: z.string().datetime().optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .refine((v) => v.type !== 'PERCENT' || v.value <= 100, {
    message: 'Foizli chegirma 100 dan oshmasligi kerak',
    path: ['value'],
  })
  .refine((v) => !v.startsAt || !v.endsAt || new Date(v.startsAt) < new Date(v.endsAt), {
    message: 'Tugash sanasi boshlanish sanasidan keyin bo`lishi kerak',
    path: ['endsAt'],
  });

export async function GET() {
  const { err } = await assertAdmin();
  if (err) return err;

  const promos = await prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return apiOk({
    items: promos.map((p) => ({
      id: p.id,
      code: p.code,
      type: p.type,
      value: Number(p.value),
      minOrderTotal: p.minOrderTotal ? Number(p.minOrderTotal) : null,
      maxDiscount: p.maxDiscount ? Number(p.maxDiscount) : null,
      usageLimit: p.usageLimit,
      usagePerUser: p.usagePerUser,
      usedCount: p.usedCount,
      startsAt: p.startsAt?.toISOString() ?? null,
      endsAt: p.endsAt?.toISOString() ?? null,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { err } = await assertAdmin();
  if (err) return err;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const input = parsed.data;
  // Kodlar har doim KATTA harfda saqlanadi — checkout va validate ham
  // `toUpperCase()` qilib qidiradi.
  const code = input.code.toUpperCase();

  const exists = await prisma.promoCode.findUnique({ where: { code }, select: { id: true } });
  if (exists) return apiError(409, 'CODE_TAKEN', `«${code}» kodi allaqachon mavjud`);

  const promo = await prisma.promoCode.create({
    data: {
      code,
      type: input.type,
      value: input.value,
      minOrderTotal: input.minOrderTotal ?? null,
      maxDiscount: input.maxDiscount ?? null,
      usageLimit: input.usageLimit ?? null,
      usagePerUser: input.usagePerUser,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null,
      isActive: input.isActive,
    },
  });

  return apiOk({
    promo: {
      id: promo.id,
      code: promo.code,
      type: promo.type,
      value: Number(promo.value),
      minOrderTotal: promo.minOrderTotal ? Number(promo.minOrderTotal) : null,
      maxDiscount: promo.maxDiscount ? Number(promo.maxDiscount) : null,
      usageLimit: promo.usageLimit,
      usagePerUser: promo.usagePerUser,
      usedCount: promo.usedCount,
      startsAt: promo.startsAt?.toISOString() ?? null,
      endsAt: promo.endsAt?.toISOString() ?? null,
      isActive: promo.isActive,
      createdAt: promo.createdAt.toISOString(),
    },
  });
}
