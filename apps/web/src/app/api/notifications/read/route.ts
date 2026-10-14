// Bildirishnomalarni o'qildi deb belgilash.
// POST { ids: string[] } — tanlanganlar; POST { all: true } — hammasi

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { markNotificationsRead, NOTIFICATIONS_PAGE_MAX } from '@/lib/notifications-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Ikkalasidan biri aniq aytilishi kerak: bo'sh tana «hammasini»
// anglatmaydi — tasodifiy so'rov butun ro'yxatni o'qilgan qilib
// yubormasin.
const bodySchema = z.union([
  z.object({ ids: z.array(z.string().uuid()).min(1).max(NOTIFICATIONS_PAGE_MAX) }),
  z.object({ all: z.literal(true) }),
]);

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(400, 'VALIDATION', "Noto'g'ri ma'lumot");

  const ids = 'ids' in parsed.data ? parsed.data.ids : null;
  return apiOk(await markNotificationsRead(user.id, ids));
}
