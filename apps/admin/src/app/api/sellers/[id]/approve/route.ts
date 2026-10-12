// Sotuvchi arizasini tasdiqlash: Seller PENDING → ACTIVE (+ approvedAt), egasi PENDING → ACTIVE.
//
// Qoidalar (audit Y3):
//   • faqat KUTILAYOTGAN ariza tasdiqlanadi — ilgari bloklangan sotuvchini ham shu tugma
//     qayta ochardi; to'xtatilganni qayta yoqish — alohida amal (`/status`);
//   • STIR kiritilmagan ariza tasdiqlanmaydi (kim bilan ishlayotganimiz noma'lum);
//   • bloklangan/o'chirilgan foydalanuvchi shartsiz ACTIVE qilinmaydi.

import { assertAdmin } from '@/lib/api-guard';
import { writeAudit } from '@/lib/audit';
import { apiError, apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

class StateChangedError extends Error {}

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { err, userId } = await assertAdmin();
  if (err) return err;

  const sellerId = params.id;
  if (!/^[a-f0-9-]{36}$/i.test(sellerId)) {
    return apiError(400, 'VALIDATION', "Sotuvchi ID noto'g'ri");
  }

  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: {
      id: true,
      status: true,
      tin: true,
      ownerUserId: true,
      owner: { select: { status: true } },
    },
  });
  if (!seller) return apiError(404, 'NOT_FOUND', 'Sotuvchi topilmadi');
  if (seller.status !== 'PENDING') {
    return apiError(
      409,
      'NOT_PENDING',
      seller.status === 'ACTIVE'
        ? 'Sotuvchi allaqachon tasdiqlangan'
        : 'Faqat kutilayotgan ariza tasdiqlanadi (to‘xtatilganni «Faollashtirish» bilan yoqing)',
    );
  }
  if (!seller.tin) {
    return apiError(409, 'KYC_MISSING', 'STIR kiritilmagan — sotuvchidan rekvizitlarni so‘rang');
  }
  if (seller.owner.status === 'BLOCKED' || seller.owner.status === 'DELETED') {
    return apiError(409, 'OWNER_BLOCKED', 'Sotuvchi hisobi bloklangan yoki o‘chirilgan');
  }

  try {
    await prisma.$transaction(async (tx) => {
      const moved = await tx.seller.updateMany({
        where: { id: sellerId, status: 'PENDING' },
        data: { status: 'ACTIVE', approvedAt: new Date() },
      });
      if (moved.count === 0) throw new StateChangedError();
      await tx.user.updateMany({
        where: { id: seller.ownerUserId, status: 'PENDING' },
        data: { status: 'ACTIVE' },
      });
      await writeAudit(
        { userId, action: 'seller.approve', resource: 'Seller', resourceId: sellerId },
        tx,
      );
    });
  } catch (e) {
    if (e instanceof StateChangedError) {
      return apiError(409, 'CONCURRENT_UPDATE', 'Ariza holati boshqa jarayonda o‘zgardi');
    }
    throw e;
  }

  return apiOk({ seller: { id: sellerId, status: 'ACTIVE' } });
}
