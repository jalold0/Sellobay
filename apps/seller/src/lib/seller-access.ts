// Sotuvchi profilining holati bo'yicha ruxsat — bitta joyda (audit Y4).
//
// Ilgari faqat tovar yaratish holatni tekshirardi: tasdiqlanmagan yoki to'xtatilgan sotuvchi
// zaxirani o'zgartira olardi, dashboard esa doim «Faol» deb ko'rsatardi.
//
//   PENDING   — ariza ko'rib chiqilmoqda: panelga kirmaydi (login rad etadi);
//   ACTIVE    — to'liq ruxsat;
//   SUSPENDED — admin to'xtatgan: ko'radi, lekin hech narsani o'zgartira olmaydi;
//   BLOCKED   — ariza rad etilgan: panelga kirmaydi.

import { apiError } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

import type { SellerStatus } from '@ecom/database';

export interface SellerProfile {
  id: string;
  status: SellerStatus;
}

const WRITE_DENIED: Record<Exclude<SellerStatus, 'ACTIVE'>, { code: string; message: string }> = {
  PENDING: {
    code: 'SELLER_NOT_ACTIVE',
    message: 'Arizangiz hali tasdiqlanmagan. Admin tasdiqlagandan keyin o‘zgartira olasiz.',
  },
  SUSPENDED: {
    code: 'SELLER_SUSPENDED',
    message:
      'Do‘koningiz vaqtincha to‘xtatilgan — o‘zgartirish mumkin emas. Admin bilan bog‘laning.',
  },
  BLOCKED: { code: 'SELLER_BLOCKED', message: 'Sotuvchi hisobingiz bloklangan.' },
};

/**
 * Joriy foydalanuvchining sotuvchi profili. `write` — o'zgartiruvchi amal: faqat ACTIVE.
 * Natija: `{ seller }` yoki tayyor xato javobi `{ err }`.
 */
export async function requireSeller(
  userId: string,
  mode: 'read' | 'write',
): Promise<{ seller: SellerProfile; err: null } | { seller: null; err: Response }> {
  const seller = await prisma.seller.findUnique({
    where: { ownerUserId: userId },
    select: { id: true, status: true },
  });
  if (!seller) {
    return {
      seller: null,
      err: apiError(
        403,
        'NO_SELLER_PROFILE',
        "Sotuvchi profilingiz yo'q. /sell sahifasidan ariza qoldiring.",
      ),
    };
  }
  if (seller.status === 'BLOCKED' || (mode === 'write' && seller.status !== 'ACTIVE')) {
    const denied = WRITE_DENIED[seller.status as Exclude<SellerStatus, 'ACTIVE'>];
    return { seller: null, err: apiError(403, denied.code, denied.message) };
  }
  return { seller, err: null };
}

/** Admin rad etgan / to'xtatgandagi oxirgi sabab (AuditLog'dan). */
export async function lastSellerDecisionReason(
  sellerId: string,
  action: 'seller.reject' | 'seller.suspend',
): Promise<string | null> {
  const row = await prisma.auditLog.findFirst({
    where: { resource: 'Seller', resourceId: sellerId, action },
    orderBy: { createdAt: 'desc' },
    select: { meta: true },
  });
  const meta = row?.meta as { reason?: unknown } | null | undefined;
  return typeof meta?.reason === 'string' ? meta.reason : null;
}
