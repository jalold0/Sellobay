// POST /api/global/sourcing — havola orqali buyurtma so'rovi yaratish
// GET  /api/global/sourcing — joriy foydalanuvchining so'rovlari
// Interface qatlami: rate-limit + parse + auth. Biznes-logika @/lib/sourcing-server da.

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { enforceRateLimit } from '@/lib/rate-limit';
import {
  createSourcingRequest,
  createSourcingRequestSchema,
  listUserSourcingRequests,
  SourcingError,
} from '@/lib/sourcing-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Havola-spam himoyasi: bitta IP'dan 60 soniyada 10 ta so'rov
  const limited = await enforceRateLimit(req, 'sourcing-create', { limit: 10, windowSec: 60 });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = createSourcingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const currentUser = await getCurrentUser();
  try {
    return apiOk(await createSourcingRequest(parsed.data, currentUser));
  } catch (e) {
    if (e instanceof SourcingError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  return apiOk(await listUserSourcingRequests(user.id));
}
