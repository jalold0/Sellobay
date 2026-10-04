// GET /api/courier/deliveries — kuryerning yetkazishlari.
//
// `mine`      — o'ziga biriktirilgan, hali tugamaganlari;
// `available` — kuryersiz turganlari (istalgan kuryer olishi mumkin).
//
// Biznes-logika `@/lib/courier-server` da; bu yerda faqat auth + rol.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { assertCourier, CourierError, listCourierDeliveries } from '@/lib/courier-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  try {
    assertCourier(user.roles);
    return apiOk(await listCourierDeliveries(user.id));
  } catch (e) {
    if (e instanceof CourierError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
