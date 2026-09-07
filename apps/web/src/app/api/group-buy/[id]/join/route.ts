// POST   /api/group-buy/:id/join — guruhga qo'shilish (login talab qiladi)
// DELETE /api/group-buy/:id/join — guruhdan chiqish (faqat OPEN guruhdan)
//
// Interface qatlami: rate-limit + auth + javob mapping.
// Biznes-logika @/lib/group-buy-server da (joinDeal / leaveDeal).

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { GroupBuyError, joinDeal, leaveDeal } from '@/lib/group-buy-server';
import { enforceRateLimit } from '@/lib/rate-limit';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idSchema = z.string().uuid('Guruh manzili noto‘g‘ri');

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Guruhga ommaviy qo'shilishni cheklash: bitta IP'dan daqiqada 20 urinish.
  const limited = await enforceRateLimit(req, 'group-buy-join', { limit: 20, windowSec: 60 });
  if (limited) return limited;

  const id = idSchema.safeParse(params.id);
  if (!id.success) return apiError(400, 'VALIDATION', 'Guruh topilmadi');

  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Guruhga qo‘shilish uchun tizimga kiring');

  try {
    return apiOk(await joinDeal(id.data, user.id));
  } catch (e) {
    if (e instanceof GroupBuyError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await enforceRateLimit(req, 'group-buy-leave', { limit: 20, windowSec: 60 });
  if (limited) return limited;

  const id = idSchema.safeParse(params.id);
  if (!id.success) return apiError(400, 'VALIDATION', 'Guruh topilmadi');

  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  try {
    return apiOk({ deal: await leaveDeal(id.data, user.id) });
  } catch (e) {
    if (e instanceof GroupBuyError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
