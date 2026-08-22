// PATCH /api/global/catalog/:id — narxni qayta hisoblash.
// Ikki holat: Xitoyda narx o'zgardi, yoki kargo tovarni tortdi (actualWeightKg).

import type { NextRequest } from 'next/server';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import {
  GlobalCatalogError,
  repriceGlobalProduct,
  repriceGlobalProductSchema,
} from '@/lib/global-catalog-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  const parsed = repriceGlobalProductSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const user = await getCurrentUser();
  try {
    return apiOk(await repriceGlobalProduct(params.id, parsed.data, user));
  } catch (e) {
    if (e instanceof GlobalCatalogError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
