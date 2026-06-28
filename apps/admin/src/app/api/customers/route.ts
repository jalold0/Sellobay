// GET /api/customers — mijozlar (CUSTOMER roli). Faqat ADMIN/SUPER_ADMIN.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user) return { err: apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan') };
  const allowed = ['ADMIN', 'SUPER_ADMIN'];
  if (!user.roles?.some((r) => allowed.includes(r))) {
    return { err: apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)") };
  }
  return { err: null };
}

export async function GET() {
  const { err } = await assertAdmin();
  if (err) return err;

  const users = await prisma.user.findMany({
    where: { roles: { some: { role: 'CUSTOMER' } } },
    orderBy: { createdAt: 'desc' },
    take: 300,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      status: true,
      loyaltyPoints: true,
      createdAt: true,
      addresses: { take: 1, orderBy: { isDefault: 'desc' }, select: { city: true } },
      _count: { select: { orders: true } },
    },
  });

  // Mijoz bo'yicha sarflagan summa (buyurtmalar yig'indisi)
  const spentRows = await prisma.order.groupBy({
    by: ['userId'],
    _sum: { grandTotal: true },
    where: { userId: { not: null } },
  });
  const spentMap = new Map(spentRows.map((r) => [r.userId, Number(r._sum.grandTotal ?? 0)]));

  const items = users.map((u) => ({
    id: u.id,
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    email: u.email,
    phone: u.phone ?? '',
    avatarUrl: u.avatarUrl,
    city: u.addresses[0]?.city ?? null,
    status: u.status,
    ordersCount: u._count.orders,
    totalSpent: spentMap.get(u.id) ?? 0,
    loyaltyPoints: u.loyaltyPoints,
    registeredAt: u.createdAt.toISOString(),
  }));

  return apiOk({ items });
}
