import { NextRequest } from 'next/server';
import { z } from 'zod';
import { normalizeUzPhone } from '@ecom/utils';
import { prisma } from '@/lib/db';
import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  return apiOk({ user });
}

const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional().nullable(),
  lastName: z.string().trim().min(1).max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().min(9).max(20).optional().nullable(),
  gender: z.enum(['MALE', 'FEMALE', 'UNSPECIFIED']).optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  locale: z.enum(['uz', 'ru', 'en']).optional(),
});

export async function PATCH(req: NextRequest) {
  const current = await getCurrentUser();
  if (!current) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }
  const input = parsed.data;

  // Telefon va emailni o'zgartirayotgan bo'lsa, ularning band emasligini tekshirish
  const data: Record<string, unknown> = {};
  if (input.firstName !== undefined) data.firstName = input.firstName;
  if (input.lastName !== undefined) data.lastName = input.lastName;
  if (input.gender !== undefined) data.gender = input.gender;
  if (input.locale !== undefined) data.locale = input.locale;
  if (input.birthDate !== undefined) {
    data.birthDate = input.birthDate ? new Date(input.birthDate) : null;
  }

  if (input.email !== undefined) {
    const normalizedEmail = input.email ? input.email.toLowerCase().trim() : null;
    if (normalizedEmail && normalizedEmail !== current.email) {
      const exists = await prisma.user.findFirst({
        where: { email: normalizedEmail, NOT: { id: current.id } },
      });
      if (exists) return apiError(409, 'EMAIL_TAKEN', 'Bu email allaqachon band');
    }
    data.email = normalizedEmail;
    // Email o'zgartirilsa, qayta tasdiqlash kerak (keyingi bosqich)
    if (normalizedEmail !== current.email) data.emailVerifiedAt = null;
  }

  if (input.phone !== undefined) {
    const normalizedPhone = input.phone ? normalizeUzPhone(input.phone) : null;
    if (input.phone && !normalizedPhone) {
      return apiError(400, 'VALIDATION', "Telefon raqami noto'g'ri (+998XXXXXXXXX)");
    }
    if (normalizedPhone && normalizedPhone !== current.phone) {
      const exists = await prisma.user.findFirst({
        where: { phone: normalizedPhone, NOT: { id: current.id } },
      });
      if (exists) return apiError(409, 'PHONE_TAKEN', 'Bu telefon allaqachon band');
    }
    data.phone = normalizedPhone;
    if (normalizedPhone !== current.phone) data.phoneVerifiedAt = null;
  }

  const updated = await prisma.user.update({
    where: { id: current.id },
    data,
    select: {
      id: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      locale: true,
      status: true,
      loyaltyPoints: true,
      gender: true,
      birthDate: true,
    },
  });

  return apiOk({ user: { ...updated, roles: current.roles ?? [] } });
}
