// POST /api/returns/[orderId]/receive — mijoz qaytarilgan tovarni o'zi olib keldi, admin
// qabul qildi (kuryersiz). Zaxira shu paytda qaytadi — so'rov paytida emas (audit Y6).

import { assertAdmin } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { receiveReturnInPerson, ReturnError } from '@/lib/returns-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { orderId: string } }) {
  const { err, userId } = await assertAdmin();
  if (err || !userId) return err ?? apiError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');

  try {
    const result = await receiveReturnInPerson(params.orderId, userId);
    return apiOk(result);
  } catch (e) {
    if (e instanceof ReturnError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
