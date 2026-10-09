// POST /api/returns/[orderId]/dispatch — qaytarishni TASDIQLASH:
// kuryerga topshiriq ochish.
//
// Tasdiqlash aynan shu amal: topshiriq ochilgani adminning roziligini
// bildiradi. Alohida «tasdiqlangan» maydoni qo'shilmadi — u faqat
// takrorlangan holat bo'lardi va ikkalasi vaqt o'tib bir-biriga mos
// kelmay qolishi mumkin edi.

import { assertAdmin } from '@/lib/api-guard';
import { apiError, apiOk } from '@/lib/auth/errors';
import { createReturnDeliveries, ReturnError } from '@/lib/returns-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, { params }: { params: { orderId: string } }) {
  const { err } = await assertAdmin();
  if (err) return err;

  try {
    const result = await createReturnDeliveries(params.orderId);
    return apiOk(result);
  } catch (e) {
    if (e instanceof ReturnError) return apiError(e.status, e.code, e.message);
    throw e;
  }
}
