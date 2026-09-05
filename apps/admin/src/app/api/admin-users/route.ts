// GET /api/admin-users — panelga kirish huquqi bor xodimlar ro'yxati.
//
// Ilgari sozlamalardagi «Foydalanuvchilar» tab'i `mockAdminUsers` ni
// ko'rsatardi — to'qima ismlar va rollar. Admin kimda qanday huquq borligini
// ko'rish uchun kirsa, haqiqatga aloqasi bo'lmagan ro'yxatni ko'rardi.

import { assertAdmin } from '@/lib/api-guard';
import { apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Xodim hisoblanadigan rollar — CUSTOMER va SELLER kirmaydi
 * (ular panel foydalanuvchisi emas).
 */
const STAFF_ROLES = [
  'ADMIN',
  'SUPER_ADMIN',
  'MARKETING_MANAGER',
  'FINANCE_MANAGER',
  'SUPPORT_AGENT',
  'WAREHOUSE_STAFF',
] as const;

export async function GET() {
  const { err } = await assertAdmin();
  if (err) return err;

  const users = await prisma.user.findMany({
    where: { roles: { some: { role: { in: [...STAFF_ROLES] } } } },
    orderBy: { createdAt: 'asc' },
    take: 200,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      roles: { select: { role: true } },
    },
  });

  return apiOk({
    items: users.map((u) => ({
      id: u.id,
      firstName: u.firstName ?? '',
      lastName: u.lastName ?? '',
      email: u.email,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      status: u.status,
      // Faqat xodim rollari ko'rsatiladi — CUSTOMER hammada bor va
      // ro'yxatni chalkashtirardi.
      roles: u.roles
        .map((r) => r.role)
        .filter((r) => (STAFF_ROLES as readonly string[]).includes(r)),
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
