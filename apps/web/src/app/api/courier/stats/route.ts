// GET /api/courier/stats — kuryerning kunlik ko'rsatkichlari.
//
// Ilova bu raqamlarni O'ZI hisoblamaydi: buning uchun unga butun
// tarix kerak bo'lardi (ro'yxat esa sahifalab beriladi) va «bugun»
// qurilma zonasida hisoblanardi — chet elda turgan telefon boshqa
// kunni ko'rsatardi. Kun chegarasi Toshkent vaqtida, serverda.

import { withApi, requireUser } from '@/lib/api-handler';
import { assertCourier, courierStats } from '@/lib/courier-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withApi(async () => {
  const user = await requireUser();
  assertCourier(user.roles);
  return { stats: await courierStats(user.id) };
});
