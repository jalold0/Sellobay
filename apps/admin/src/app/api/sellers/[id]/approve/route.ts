// Sotuvchini tasdiqlash. Seller.status=ACTIVE + approvedAt + foydalanuvchi ham ACTIVE bo'ladi.

import { NextRequest } from 'next/server';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  const allowed = ['ADMIN', 'SUPER_ADMIN'];
  if (!user.roles?.some((r) => allowed.includes(r))) {
    return apiError(403, 'FORBIDDEN', "Ruxsat yo'q");
  }

  const sellerId = params.id;
  if (!/^[a-f0-9-]{36}$/i.test(sellerId)) {
    return apiError(400, 'VALIDATION', "Sotuvchi ID noto'g'ri");
  }

  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { id: true, ownerUserId: true, status: true },
  });
  if (!seller) return apiError(404, 'NOT_FOUND', 'Sotuvchi topilmadi');
  if (seller.status === 'ACTIVE') {
    return apiError(409, 'ALREADY_ACTIVE', 'Sotuvchi allaqachon tasdiqlangan');
  }

  // Tranzaksiya: Seller'ni ACTIVE qilamiz va foydalanuvchini ham ACTIVE qilamiz (agar PENDING bo'lsa)
  const [updatedSeller] = await prisma.$transaction([
    prisma.seller.update({
      where: { id: sellerId },
      data: { status: 'ACTIVE', approvedAt: new Date() },
      select: { id: true, status: true },
    }),
    prisma.user.update({
      where: { id: seller.ownerUserId },
      data: { status: 'ACTIVE' },
    }),
  ]);

  return apiOk({ seller: updatedSeller });
}
