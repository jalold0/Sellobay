// Mijozning ilova ichidagi bildirishnomalari.
// GET ?cursor=&limit= — ro'yxat (eng yangisi birinchi) + o'qilmaganlar soni

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { listNotifications, NOTIFICATIONS_PAGE_MAX } from '@/lib/notifications-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const querySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(NOTIFICATIONS_PAGE_MAX).optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return apiError(400, 'VALIDATION', "Noto'g'ri so'rov");

  return apiOk(await listNotifications(user.id, parsed.data));
}
