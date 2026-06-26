// Tasdiq kutilayotgan sotuvchilar ro'yxati. Faqat ADMIN/SUPER_ADMIN kira oladi.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function assertAdmin() {
  const user = await getCurrentUser();
  if (!user) return { user: null, err: apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan') };
  const allowed = ['ADMIN', 'SUPER_ADMIN'];
  const ok = user.roles?.some((r) => allowed.includes(r));
  if (!ok) return { user, err: apiError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)") };
  return { user, err: null };
}

export async function GET() {
  const { err } = await assertAdmin();
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
      owner: s.owner,
    })),
  });
}
