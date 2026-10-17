// GET /api/payouts — sotuvchilarga to'lovlar (ADR 0015): to'lash kerak bo'lganlar, sotuvchilar
// balansi (qaytarish muddatida / to'lovga tayyor) va oxirgi to'langanlar.

import { Prisma } from '@ecom/database';
import { loadMarketplaceSettings, payoutDayNoon } from '@ecom/order-ops';

import { requirePermission } from '@/lib/api-guard';
import { apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const payoutSelect = {
  id: true,
  amount: true,
  status: true,
  periodStart: true,
  periodEnd: true,
  paidAt: true,
  reference: true,
  bankAccount: true,
  bankName: true,
  note: true,
  createdAt: true,
  seller: { select: { id: true, brandName: true } },
  _count: { select: { entries: true } },
} as const;

export async function GET() {
  const { err } = await requirePermission('payouts.manage');
  if (err) return err;

  const now = new Date();
  const [pending, history, open, settings] = await Promise.all([
    prisma.sellerPayout.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: payoutSelect,
    }),
    prisma.sellerPayout.findMany({
      where: { status: { in: ['PAID', 'CANCELLED'] } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: payoutSelect,
    }),
    prisma.sellerLedgerEntry.findMany({
      where: { payoutId: null },
      select: { sellerId: true, amount: true, availableAt: true },
    }),
    loadMarketplaceSettings(prisma),
  ]);

  // Sotuvchilar balansi — hali to'lovga yig'ilmagan yozuvlar.
  const zero = new Prisma.Decimal(0);
  const bySeller = new Map<string, { pending: Prisma.Decimal; available: Prisma.Decimal }>();
  for (const e of open) {
    const b = bySeller.get(e.sellerId) ?? { pending: zero, available: zero };
    if (e.availableAt > now) b.pending = b.pending.add(e.amount);
    else b.available = b.available.add(e.amount);
    bySeller.set(e.sellerId, b);
  }
  const sellers = await prisma.seller.findMany({
    where: { id: { in: [...bySeller.keys()] } },
    select: { id: true, brandName: true, bankAccount: true },
  });

  const toView = (p: (typeof pending)[number]) => ({
    id: p.id,
    amount: p.amount.toFixed(2),
    status: p.status,
    periodStart: p.periodStart.toISOString(),
    periodEnd: p.periodEnd.toISOString(),
    paidAt: p.paidAt?.toISOString() ?? null,
    reference: p.reference,
    bankAccount: p.bankAccount,
    bankName: p.bankName,
    note: p.note,
    seller: p.seller,
    entries: p._count.entries,
  });

  return apiOk({
    nextPayoutAt: payoutDayNoon(now, settings.payoutDays),
    payoutDays: settings.payoutDays,
    pending: pending.map(toView),
    history: history.map(toView),
    balances: sellers
      .map((s) => {
        const b = bySeller.get(s.id)!;
        return {
          seller: { id: s.id, brandName: s.brandName },
          hasBankAccount: Boolean(s.bankAccount),
          pending: b.pending.toFixed(2),
          available: b.available.toFixed(2),
        };
      })
      .sort((a, b) => new Prisma.Decimal(b.available).cmp(a.available)),
  });
}
