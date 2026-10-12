// GET /api/refunds — pul qaytarilishi kutilayotgan buyurtmalar (bekor qilingan yoki qaytarilgan,
// to'langan, hali to'liq qaytarilmagan). Admin «Qaytarishlar» sahifasidagi navbat.

import { assertAdmin } from '@/lib/api-guard';
import { apiOk } from '@/lib/auth/errors';
import { listPendingRefunds } from '@/lib/refund-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { err } = await assertAdmin();
  if (err) return err;
  return apiOk({ items: await listPendingRefunds() });
}
