// GET /api/group-buy — faol guruh xaridlari (web + mobil uchun umumiy).
// Interface qatlami: auth (ixtiyoriy) + javob mapping.
// Biznes-logika @/lib/group-buy-server da.
//
// Auth ixtiyoriy: login qilmagan mijoz ham ro'yxatni ko'radi, faqat
// `joined` maydoni har doim false bo'ladi.

import { apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { listActiveDeals } from '@/lib/group-buy-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  return apiOk({ deals: await listActiveDeals(user?.id ?? null) });
}
