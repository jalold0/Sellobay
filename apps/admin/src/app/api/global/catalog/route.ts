// POST /api/global/catalog — Xitoy tovarini katalogga import qilish (Product + GlobalSource)
// GET  /api/global/catalog — import qilingan global tovarlar ro'yxati
// Rol tekshiruvi global-catalog-server ichida (assertOperator).

import type { NextRequest } from 'next/server';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import {
  GlobalCatalogError,
  importGlobalProduct,
  importGlobalProductSchema,
  listGlobalProducts,
} from '@/lib/global-catalog-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = importGlobalProductSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const user = await getCurrentUser();
  try {
    return apiOk(await importGlobalProduct(parsed.data, user));
  } catch (e) {
    if (e instanceof GlobalCatalogError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}

export async function GET(req: NextRequest) {
  // Diqqat: Number(null) = 0 — parametr yo'q bo'lsa take: 0 bo'lib ro'yxat BO'SH qaytardi
  const takeParam = req.nextUrl.searchParams.get('take');
  const takeRaw = takeParam === null ? NaN : Number(takeParam);
  const take = Number.isFinite(takeRaw) && takeRaw > 0 ? takeRaw : undefined;

  const user = await getCurrentUser();
  try {
    return apiOk(await listGlobalProducts(user, take));
  } catch (e) {
    if (e instanceof GlobalCatalogError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
