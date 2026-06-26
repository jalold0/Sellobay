// Single address: PATCH va DELETE

import { NextRequest } from 'next/server';
import { normalizeUzPhone } from '@ecom/utils';
import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  label: z.string().trim().max(40).optional().nullable(),
  type: z.enum(['HOME', 'WORK', 'PICKUP', 'OTHER']).optional(),
  recipientName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(9).max(20).optional(),
  region: z.string().trim().min(2).max(80).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  district: z.string().trim().max(80).optional().nullable(),
  street: z.string().trim().min(2).max(200).optional(),
  building: z.string().trim().max(40).optional().nullable(),
  apartment: z.string().trim().max(40).optional().nullable(),
  landmark: z.string().trim().max(200).optional().nullable(),
  isDefault: z.boolean().optional(),
});

async function assertOwn(addressId: string, userId: string) {
  const a = await prisma.userAddress.findUnique({ where: { id: addressId } });
  if (!a) return { err: apiError(404, 'NOT_FOUND', 'Manzil topilmadi'), address: null };
  if (a.userId !== userId) return { err: apiError(403, 'FORBIDDEN', "Ruxsat yo'q"), address: null };
  return { err: null, address: a };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const { err, address } = await assertOwn(params.id, user.id);
  if (err) return err;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }
  const input = parsed.data;

  if (input.phone) {
    input.phone = normalizeUzPhone(input.phone) ?? input.phone;
  }
  if (input.isDefault && !address!.isDefault) {
    await prisma.userAddress.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    });
  }

  const updated = await prisma.userAddress.update({
    where: { id: params.id },
    data: input,
  });

  return apiOk({ address: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const { err } = await assertOwn(params.id, user.id);
  if (err) return err;

  await prisma.userAddress.delete({ where: { id: params.id } });
  return apiOk({ deleted: true });
}
