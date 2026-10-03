// POST /api/courier/deliveries/[id]/claim — bo'sh yetkazishni o'ziga olish.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { assertCourier, claimDelivery, CourierError } from '@/lib/courier-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  try {
    assertCourier(user.roles);
    return apiOk({ delivery: await claimDelivery(user.id, params.id) });
  } catch (e) {
    if (e instanceof CourierError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
