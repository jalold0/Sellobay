// GET /api/courier/history — kuryerning tugagan topshiriqlari.
//
// `/api/courier/deliveries/history` EMAS: o'sha yo'lda yonida
// `[id]` dinamik segmenti turibdi va "history" so'zi topshiriq
// identifikatoriga o'xshab ko'rinardi.

import { z } from 'zod';

import { withApi, requireUser } from '@/lib/api-handler';
import { assertCourier, listCourierHistory } from '@/lib/courier-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const GET = withApi(async (req: NextRequest) => {
  const user = await requireUser();
  assertCourier(user.roles);
  // `parse` — `withApi` ZodError'ni 400 ga, maydon sabablari bilan
  // o'giradi. Qo'lda `safeParse` + xabar yig'ish kerak emas.
  const params = schema.parse(Object.fromEntries(req.nextUrl.searchParams));
  return listCourierHistory(user.id, params);
});
