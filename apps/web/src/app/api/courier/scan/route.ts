// POST /api/courier/scan — posilka yorlig'ini skanerlab qo'lga olish (ADR 0017).
//
// Egasiz posilka kuryerga biriktiriladi va «olindi» bo'ladi; o'ziniki bo'lsa
// faqat «olindi». Qoidalar `scanParcel` da.

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { assertCourier, CourierError, scanParcel } from '@/lib/courier-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  // Kamera o'qigan matn yoki qo'lda terilgan kod — tahlilni server qiladi.
  payload: z.string().trim().min(1).max(200),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  try {
    assertCourier(user.roles);
    const result = await scanParcel(user.id, parsed.data.payload, {
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    });
    return apiOk(result);
  } catch (e) {
    if (e instanceof CourierError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
