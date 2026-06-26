// Single payment method: DELETE

import { NextRequest } from 'next/server';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const pm = await prisma.paymentMethod.findUnique({ where: { id: params.id } });
  if (!pm) return apiError(404, 'NOT_FOUND', "To'lov usuli topilmadi");
  if (pm.userId !== user.id) return apiError(403, 'FORBIDDEN', "Ruxsat yo'q");

  await prisma.paymentMethod.delete({ where: { id: params.id } });
  return apiOk({ deleted: true });
}
