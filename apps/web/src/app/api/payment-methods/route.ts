// Saved payment methods — GET va DELETE (POST keyingi bosqichda real provider integratsiyasi bilan)

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const items = await prisma.paymentMethod.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      provider: true,
      brand: true,
      last4: true,
      expiryMonth: true,
      expiryYear: true,
      isDefault: true,
      createdAt: true,
    },
  });

  return apiOk({ items });
}
