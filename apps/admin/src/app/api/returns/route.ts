// GET /api/returns — topshirig'i hali ochilmagan qaytarishlar.
//
// Mijoz qaytarishni so'raganda buyurtma `RETURNED` bo'ladi, lekin
// mahsulot hali mijozda turadi. Kuryer topshirig'i AVTOMATIK
// ochilmaydi: asossiz so'rov ham kuryerni yo'lga chiqarardi. Shuning
// uchun avval admin shu ro'yxatda ko'radi va tasdiqlaydi.

import { assertAdmin } from '@/lib/api-guard';
import { apiOk } from '@/lib/auth/errors';
import { listPendingReturns } from '@/lib/returns-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { err } = await assertAdmin();
  if (err) return err;

  return apiOk({ items: await listPendingReturns() });
}
