// POST   /api/global/sourcing/:id/quote — operator narx taklif qiladi (ADMIN / SUPER_ADMIN)
// DELETE /api/global/sourcing/:id/quote — operator "tovar yo'q" deb belgilaydi
// PATCH  /api/global/sourcing/:id/quote — operator so'rovni tekshiruvga oladi (IN_REVIEW)

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import {
  markSourcingInReview,
  markSourcingUnavailable,
  markUnavailableSchema,
  quoteSourcingRequest,
  quoteSourcingRequestSchema,
  SourcingError,
} from '@/lib/sourcing-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export async function POST(req: NextRequest, { params }: Params) {
  const body = await req.json().catch(() => null);
  const parsed = quoteSourcingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const user = await getCurrentUser();
  try {
    return apiOk(await quoteSourcingRequest(params.id, parsed.data, user));
  } catch (e) {
    if (e instanceof SourcingError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}

export async function PATCH(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  try {
    return apiOk(await markSourcingInReview(params.id, user));
  } catch (e) {
    if (e instanceof SourcingError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const body = await req.json().catch(() => null);
  const parsed = markUnavailableSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? 'Sabab kiriting');
  }

  const user = await getCurrentUser();
  try {
    return apiOk(await markSourcingUnavailable(params.id, parsed.data.reason, user));
  } catch (e) {
    if (e instanceof SourcingError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
