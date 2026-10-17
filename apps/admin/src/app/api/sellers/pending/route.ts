// Tasdiq kutilayotgan sotuvchilar ro'yxati. Faqat ADMIN/SUPER_ADMIN kira oladi.

import { requirePermission } from '@/lib/api-guard';
import { apiOk } from '@/lib/auth/errors';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { err } = await requirePermission('sellers.manage');
  if (err) return err;

  const items = await prisma.seller.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: 100,
    select: {
      id: true,
      legalName: true,
      brandName: true,
      email: true,
      phone: true,
      status: true,
      createdAt: true,
      tin: true,
      registrationNo: true,
      bankName: true,
      bankAccount: true,
      owner: {
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      },
    },
  });

  return apiOk({
    items: items.map((s) => ({
      id: s.id,
      legalName: s.legalName,
      brandName: s.brandName,
      email: s.email,
      phone: s.phone,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
      tin: s.tin,
      registrationNo: s.registrationNo,
      bankName: s.bankName,
      bankAccount: s.bankAccount,
      owner: s.owner,
    })),
  });
}
