// GET    /api/global/sourcing/:id — bitta so'rov (faqat egasi)
// PATCH  /api/global/sourcing/:id — mijoz taklifga javob beradi (ACCEPT / REJECT)
// DELETE /api/global/sourcing/:id — mijoz so'rovni bekor qiladi

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import {
  cancelSourcingRequest,
  getUserSourcingRequest,
  respondToQuote,
  respondToQuoteSchema,
  SourcingError,
} from '@/lib/sourcing-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  try {
    return apiOk(await getUserSourcingRequest(params.id, user.id));
  } catch (e) {
    if (e instanceof SourcingError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const body = await req.json().catch(() => null);
  const parsed = respondToQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  try {
    return apiOk(await respondToQuote(params.id, user.id, parsed.data));
  } catch (e) {
    if (e instanceof SourcingError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  try {
    return apiOk(await cancelSourcingRequest(params.id, user.id));
  } catch (e) {
    if (e instanceof SourcingError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
