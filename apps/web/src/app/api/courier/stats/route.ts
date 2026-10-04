// GET /api/courier/stats — kuryerning kunlik ko'rsatkichlari.
//
// Ilova bu raqamlarni O'ZI hisoblamaydi: buning uchun unga butun
// tarix kerak bo'lardi (ro'yxat esa sahifalab beriladi) va «bugun»
// qurilma zonasida hisoblanardi — chet elda turgan telefon boshqa
// kunni ko'rsatardi. Kun chegarasi Toshkent vaqtida, serverda.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { assertCourier, CourierError, courierStats } from '@/lib/courier-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  try {
    assertCourier(user.roles);
    return apiOk({ stats: await courierStats(user.id) });
  } catch (e) {
    if (e instanceof CourierError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
