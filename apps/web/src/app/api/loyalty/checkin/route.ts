// POST /api/loyalty/checkin — kunlik check-in (+5 Sello Coin, kuniga 1 marta).

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { claimDailyCheckin } from '@/lib/loyalty-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const result = await claimDailyCheckin(user.id);
  return apiOk(result);
}
