// GET /api/labels            — chop etishga tayyor posilkalar (omborda, kuryer olmagan).
// GET /api/labels?ids=a,b,c  — tanlangan yetkazishlarning yorliqlari (chop etish sahifasi).

import { z } from 'zod';

import { requirePermission } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { labelsFor, listPendingLabels, MAX_LABELS } from '@/lib/labels-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const idsSchema = z.array(z.string().uuid()).min(1).max(MAX_LABELS);

export async function GET(req: NextRequest) {
  const { err } = await requirePermission('warehouse.manage');
  if (err) return err;

  const raw = req.nextUrl.searchParams.get('ids');
  if (raw === null) return apiOk({ items: await listPendingLabels() });

  const parsed = idsSchema.safeParse(raw.split(',').filter(Boolean));
  if (!parsed.success) return apiError(400, 'VALIDATION', 'Yetkazishlar ro`yxati noto`g`ri');
  return apiOk({ items: await labelsFor(parsed.data) });
}
