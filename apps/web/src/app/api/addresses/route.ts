// User Addresses CRUD — yetkazib berish manzillari
// GET /api/addresses — ro'yxat
// POST /api/addresses — yangi qo'shish

import { NextRequest } from 'next/server';
import { normalizeUzPhone } from '@ecom/utils';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const createSchema = z.object({
  label: z.string().trim().max(40).optional().nullable(),
  type: z.enum(['HOME', 'WORK', 'PICKUP', 'OTHER']).default('HOME'),
  recipientName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(9).max(20),
  region: z.string().trim().min(2).max(80).default('Toshkent'),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().max(80).optional().nullable(),
  street: z.string().trim().min(2).max(200),
  building: z.string().trim().max(40).optional().nullable(),
  apartment: z.string().trim().max(40).optional().nullable(),
  landmark: z.string().trim().max(200).optional().nullable(),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const items = await prisma.userAddress.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return apiOk({ items });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const input = parsed.data;

  const normalizedPhone = normalizeUzPhone(input.phone) ?? input.phone;

  // Default qilingan bo'lsa, boshqalarining default'ini olib tashlaymiz
  if (input.isDefault) {
    await prisma.userAddress.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const created = await prisma.userAddress.create({
    data: {
      userId: user.id,
      label: input.label,
      type: input.type,
      recipientName: input.recipientName,
      phone: normalizedPhone,
      region: input.region,
      city: input.city,
      district: input.district,
      street: input.street,
      building: input.building,
      apartment: input.apartment,
      landmark: input.landmark,
      isDefault: input.isDefault,
    },
  });

  return apiOk({ address: created }, { status: 201 });
}
