import { NextRequest } from 'next/server';
import { verifyPassword } from '@ecom/auth';
import { normalizeUzPhone } from '@ecom/utils';
import { prisma } from '@/lib/db';
import { loginSchema } from '@/lib/auth/validators';
import { apiError, apiOk } from '@/lib/auth/errors';
import { issueSession, requestMeta } from '@/lib/auth/session';
import { enforceRateLimit } from '@/lib/rate-limit';
import { lastSellerDecisionReason } from '@/lib/seller-access';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Parol terib ko'rishdan himoya: IP bo'yicha daqiqasiga 10, bitta hisobga 15 daqiqada 10 urinish.
  const limited = await enforceRateLimit(req, 'login', { limit: 10, windowSec: 60 });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri kiritma");
  }
  const { identifier, password } = parsed.data;
  const perAccount = await enforceRateLimit(
    req,
    'login-account',
    { limit: 10, windowSec: 15 * 60 },
    identifier.toLowerCase().trim(),
  );
  if (perAccount) return perAccount;

  const looksLikePhone = /^\+?\d+$/.test(identifier);
  const normalizedPhone = looksLikePhone ? normalizeUzPhone(identifier) : null;
  const normalizedEmail = !looksLikePhone ? identifier.toLowerCase().trim() : null;

  const user = await prisma.user.findFirst({
    where: normalizedPhone ? { phone: normalizedPhone } : { email: normalizedEmail! },
    select: {
      id: true,
      passwordHash: true,
      status: true,
      email: true,
      phone: true,
      firstName: true,
      lastName: true,
      roles: { select: { role: true } },
    },
  });

  if (!user || !user.passwordHash) {
    return apiError(401, 'INVALID_CREDENTIALS', "Email/telefon yoki parol noto'g'ri");
  }
  if (user.status === 'BLOCKED' || user.status === 'DELETED') {
    return apiError(403, 'ACCOUNT_BLOCKED', 'Hisob bloklangan');
  }

  const ok = await verifyPassword(user.passwordHash, password);
  if (!ok) {
    return apiError(401, 'INVALID_CREDENTIALS', "Email/telefon yoki parol noto'g'ri");
  }

  // Faqat SELLER (yoki ADMIN/SUPER_ADMIN) rollar bu panelga kira oladi
  const roleNames = user.roles.map((r: { role: string }) => r.role);
  const allowed = ['SELLER', 'ADMIN', 'SUPER_ADMIN'];
  const hasAccess = roleNames.some((r) => allowed.includes(r));
  if (!hasAccess) {
    return apiError(
      403,
      'NOT_A_SELLER',
      "Bu hisob sotuvchi sifatida ro'yxatdan o'tmagan. Avval /sell sahifasidan ariza qoldiring.",
    );
  }

  // Sotuvchi profilining holati (admin rollari tekshirilmaydi). Ilgari tasdiqlanmagan va rad
  // etilgan sotuvchilar ham panelga kirardi (audit Y4). To'xtatilgan (SUSPENDED) kiradi, lekin
  // faqat ko'radi — o'zgartiruvchi API'lar `requireSeller(…, 'write')` bilan yopiq.
  const isAdmin = roleNames.some((r) => r === 'ADMIN' || r === 'SUPER_ADMIN');
  if (!isAdmin) {
    const seller = await prisma.seller.findUnique({
      where: { ownerUserId: user.id },
      select: { id: true, status: true },
    });
    if (!seller) {
      return apiError(
        403,
        'NOT_A_SELLER',
        'Sotuvchi profili topilmadi. /sell sahifasidan ariza qoldiring.',
      );
    }
    if (seller.status === 'PENDING') {
      return apiError(
        403,
        'SELLER_PENDING',
        'Arizangiz ko‘rib chiqilmoqda. Admin tasdiqlagach, panelga kira olasiz.',
      );
    }
    if (seller.status === 'BLOCKED') {
      const reason = await lastSellerDecisionReason(seller.id, 'seller.reject');
      return apiError(
        403,
        'SELLER_REJECTED',
        reason ? `Arizangiz rad etildi: ${reason}` : 'Arizangiz rad etildi.',
      );
    }
  }

  const res = apiOk({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      roles: roleNames,
    },
  });
  await issueSession(res, user.id, requestMeta());
  return res;
}
