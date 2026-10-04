// POST /api/courier/deliveries/[id]/status — holatni oldinga surish.
//
// Mumkin bo'lgan o'tishlar `courier-server.ts` dagi jadvalda; klient
// ularni javobdagi `nextStatuses` dan oladi va faqat shularni taklif
// qiladi. Server baribir qayta tekshiradi.

import { z } from 'zod';

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { assertCourier, CourierError, updateDeliveryStatus } from '@/lib/courier-server';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  status: z.enum(['PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'FAILED']),
  note: z.string().trim().max(300).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  try {
    assertCourier(user.roles);
    const delivery = await updateDeliveryStatus(user.id, params.id, parsed.data.status, {
      note: parsed.data.note,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    });
    return apiOk({ delivery });
  } catch (e) {
    if (e instanceof CourierError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
