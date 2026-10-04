// GET /api/courier/history — kuryerning tugagan topshiriqlari.
//
// `/api/courier/deliveries/history` EMAS: o'sha yo'lda yonida
// `[id]` dinamik segmenti turibdi va "history" so'zi topshiriq
// identifikatoriga o'xshab ko'rinardi. Alohida yo'l chalkashlikni
// yo'q qiladi.

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { assertCourier, CourierError, listCourierHistory } from '@/lib/courier-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const params = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri so'rov");
  }

  try {
    assertCourier(user.roles);
    return apiOk(await listCourierHistory(user.id, parsed.data));
  } catch (e) {
    if (e instanceof CourierError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
