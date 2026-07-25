// POST /api/orders — buyurtma yaratish (web + mobile uchun umumiy)
// GET /api/orders — joriy foydalanuvchining buyurtmalari ro'yxati
// Interface qatlami: rate-limit + parse + auth + javob mapping.
// Biznes-logika @/lib/orders-server da (createOrder / listUserOrders).

import { apiError, apiOk } from '@/lib/auth/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { createOrder, createOrderSchema, listUserOrders, OrderError } from '@/lib/orders-server';
import { enforceRateLimit } from '@/lib/rate-limit';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // Buyurtma-spam himoyasi: bitta IP'dan 60 soniyada 10 buyurtma urinishi
  const limited = await enforceRateLimit(req, 'orders-create', { limit: 10, windowSec: 60 });
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(400, 'VALIDATION', parsed.error.issues[0]?.message ?? "Noto'g'ri ma'lumot");
  }

  const currentUser = await getCurrentUser();
  try {
    return apiOk(await createOrder(parsed.data, currentUser));
  } catch (e) {
    if (e instanceof OrderError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  return apiOk(await listUserOrders(user.id));
}
