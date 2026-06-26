// GET /api/loyalty — joriy foydalanuvchining Sello Coins balansi, tarixi va umumiy xaridi.
// Tier hisoblash uchun spent = barcha buyurtmalar grandTotal yig'indisi.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { hasCheckedInToday, reasonToKey } from '@/lib/loyalty-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const [dbUser, txns, spentAgg, checkedInToday] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { loyaltyPoints: true },
    }),
    prisma.loyaltyTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, points: true, reason: true, createdAt: true },
    }),
    prisma.order.aggregate({
      where: { userId: user.id },
      _sum: { grandTotal: true },
    }),
    hasCheckedInToday(user.id),
  ]);

  const now = Date.now();
  const history = txns.map((t) => ({
    id: t.id,
    type: t.points >= 0 ? ('earn' as const) : ('spend' as const),
    amount: t.points,
    reasonKey: reasonToKey(t.reason),
    daysAgo: Math.max(0, Math.floor((now - t.createdAt.getTime()) / 86_400_000)),
  }));

  return apiOk({
    coins: dbUser?.loyaltyPoints ?? 0,
    spentSom: Number(spentAgg._sum.grandTotal ?? 0),
    history,
    checkedInToday,
  });
}
