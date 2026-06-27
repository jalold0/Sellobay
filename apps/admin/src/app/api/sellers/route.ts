// Barcha sotuvchilar ro'yxati (status filtri bilan). Faqat ADMIN/SUPER_ADMIN.

import { NextRequest } from 'next/server';

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

const STATUS_MAP: Record<string, ('PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED')[]> = {
  pending: ['PENDING'],
  active: ['ACTIVE'],
  inactive: ['SUSPENDED', 'BLOCKED'],
};

export async function GET(req: NextRequest) {
  const { err } = await assertAdmin();
  if (err) return err;

  const statusParam = req.nextUrl.searchParams.get('status') ?? 'all';
  const statusFilter = STATUS_MAP[statusParam];

  const sellers = await prisma.seller.findMany({
    where: statusFilter ? { status: { in: statusFilter } } : undefined,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      legalName: true,
      brandName: true,
      phone: true,
      status: true,
      commissionRate: true,
      createdAt: true,
      owner: { select: { firstName: true, lastName: true, email: true, phone: true } },
      _count: { select: { products: true } },
    },
  });

  // Sotuvchilar bo'yicha aylanma (orderItem totalPrice yig'indisi) — bitta groupBy so'rovi
  const revenueRows = await prisma.orderItem.groupBy({
    by: ['sellerId'],
    _sum: { totalPrice: true },
  });
  const revenueMap = new Map(revenueRows.map((r) => [r.sellerId, Number(r._sum.totalPrice ?? 0)]));

  const items = sellers.map((s) => {
    const ownerName =
      [s.owner?.firstName, s.owner?.lastName].filter(Boolean).join(' ').trim() ||
      s.owner?.email ||
      s.owner?.phone ||
      '—';
    return {
      id: s.id,
      brandName: s.brandName,
      legalName: s.legalName,
      ownerName,
      phone: s.phone ?? s.owner?.phone ?? '',
      status: s.status,
      commissionRate: Number(s.commissionRate),
      productsCount: s._count.products,
      totalRevenue: revenueMap.get(s.id) ?? 0,
      appliedAt: s.createdAt.toISOString(),
    };
  });

  return apiOk({ items });
}
