// GET /api/global/fulfillment — global buyurtmalar (zayavkalar) navbati.

import type { NextRequest } from 'next/server';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { GlobalFulfillmentError, listFulfillments } from '@/lib/global-fulfillment-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status') ?? undefined;
  const user = await getCurrentUser();
  try {
    return apiOk(await listFulfillments(user, status));
  } catch (e) {
    if (e instanceof GlobalFulfillmentError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
