// GET   /api/global/fulfillment/:id       — bitta zayavka
// PATCH /api/global/fulfillment/:id       — bosqichni ilgarilatish
//   action: VERIFY (narx tekshiruvi) | PURCHASE (sotib olindi) |
//           TRACK (trek raqam + kargo) | STATUS (qo'lda status)

import type { NextRequest } from 'next/server';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import {
  GlobalFulfillmentError,
  getFulfillment,
  markPurchased,
  purchaseSchema,
  registerTracking,
  setFulfillmentStatus,
  statusSchema,
  trackSchema,
  verifyFulfillmentPrice,
  verifyPriceSchema,
} from '@/lib/global-fulfillment-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  try {
    return apiOk(await getFulfillment(params.id, user));
  } catch (e) {
    if (e instanceof GlobalFulfillmentError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  const user = await getCurrentUser();

  try {
    switch (body?.action) {
      case 'VERIFY': {
        const parsed = verifyPriceSchema.safeParse(body);
        if (!parsed.success) return apiError(400, 'VALIDATION', parsed.error.issues[0]!.message);
        return apiOk(await verifyFulfillmentPrice(params.id, parsed.data, user));
      }
      case 'PURCHASE': {
        const parsed = purchaseSchema.safeParse(body);
        if (!parsed.success) return apiError(400, 'VALIDATION', parsed.error.issues[0]!.message);
        return apiOk(await markPurchased(params.id, parsed.data, user));
      }
      case 'TRACK': {
        const parsed = trackSchema.safeParse(body);
        if (!parsed.success) return apiError(400, 'VALIDATION', parsed.error.issues[0]!.message);
        return apiOk(await registerTracking(params.id, parsed.data, user));
      }
      case 'STATUS': {
        const parsed = statusSchema.safeParse(body);
        if (!parsed.success) return apiError(400, 'VALIDATION', parsed.error.issues[0]!.message);
        return apiOk(await setFulfillmentStatus(params.id, parsed.data, user));
      }
      default:
        return apiError(400, 'UNKNOWN_ACTION', "Noma'lum amal");
    }
  } catch (e) {
    if (e instanceof GlobalFulfillmentError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
