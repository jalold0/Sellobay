// POST /api/global/catalog/preview — narxni saqlamasdan hisoblab ko'rsatish.
// Import formasi operator yozayotganda shu endpointdan jonli narx oladi.

import type { NextRequest } from 'next/server';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import {
  GlobalCatalogError,
  previewGlobalPrice,
  previewGlobalPriceSchema,
} from '@/lib/global-catalog-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = previewGlobalPriceSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const user = await getCurrentUser();
  try {
    return apiOk(await previewGlobalPrice(parsed.data, user));
  } catch (e) {
    if (e instanceof GlobalCatalogError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
