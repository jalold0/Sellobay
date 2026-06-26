// Sotuvchi arizasini rad etish. Seller.status=BLOCKED.

import { NextRequest } from 'next/server';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
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

  // Optional rejection reason
  const body = await req.json().catch(() => null);
  const reason: string | null = typeof body?.reason === 'string' ? body.reason.trim() : null;

  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { id: true, status: true },
  });
  if (!seller) return apiError(404, 'NOT_FOUND', 'Sotuvchi topilmadi');

  const updated = await prisma.seller.update({
    where: { id: sellerId },
    data: { status: 'BLOCKED' },
    select: { id: true, status: true },
  });

  // Reason'ni hozircha skip qilamiz (audit log keyingi bosqichda). Avtomatik bildirishnoma ham keyin.
  void reason;

  return apiOk({ seller: updated });
}
