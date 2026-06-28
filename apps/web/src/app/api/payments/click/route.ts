// POST /api/payments/click — Click webhook (Prepare & Complete).
// Click hujjati: https://docs.click.uz/click-api-request/
//
// ⚠️ Kerak: CLICK_SECRET_KEY (kassa sirli kaliti). Sandbox'da test qilinadi.
// Click application/x-www-form-urlencoded yuboradi. action: 0=Prepare, 1=Complete.
// Imzo: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id
//          + [merchant_prepare_id] + amount + action + sign_time)

import { createHash } from 'crypto';

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Click javob kodlari
const ERR_OK = 0;
const ERR_SIGN = -1;
const ERR_ORDER_NOT_FOUND = -5;
const ERR_ALREADY_PAID = -4;

function reply(data: Record<string, unknown>) {
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return reply({ error: ERR_SIGN, error_note: 'Invalid request' });

  const get = (k: string) => String(form.get(k) ?? '');
  const clickTransId = get('click_trans_id');
  const serviceId = get('service_id');
  const merchantTransId = get('merchant_trans_id'); // bizning order id
  const merchantPrepareId = get('merchant_prepare_id');
  const amount = get('amount');
  const action = get('action');
  const signTime = get('sign_time');
  const signString = get('sign_string');

  // 1) Imzo tekshiruvi
  const secret = process.env.CLICK_SECRET_KEY ?? '';
  const base =
    clickTransId +
    serviceId +
    secret +
    merchantTransId +
    (action === '1' ? merchantPrepareId : '') +
    amount +
    action +
    signTime;
  const expected = createHash('md5').update(base).digest('hex');
  if (!secret || expected !== signString) {
    return reply({ error: ERR_SIGN, error_note: 'SIGN CHECK FAILED' });
  }

  // 2) Buyurtmani topish
  const order = await prisma.order.findFirst({
    where: { id: merchantTransId },
    select: { id: true, status: true, grandTotal: true },
  });
  if (!order) {
    return reply({ error: ERR_ORDER_NOT_FOUND, error_note: 'Order not found' });
  }

  // 3) Prepare (action=0) — to'lovga tayyorlik
  if (action === '0') {
    return reply({
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      merchant_prepare_id: order.id,
      error: ERR_OK,
      error_note: 'Success',
    });
  }

  // 4) Complete (action=1) — to'lovni tasdiqlash
  if (action === '1') {
    if (order.status === 'PAID') {
      return reply({ error: ERR_ALREADY_PAID, error_note: 'Already paid' });
    }
    // Atomik: Payment yozuvi + Order statusi
    await prisma.$transaction([
      prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'CLICK',
          status: 'PAID',
          amount: order.grandTotal,
          externalId: clickTransId,
          paidAt: new Date(),
          // rawPayload — to'liq payload (debug uchun) qo'shilishi mumkin
        },
      }),
      prisma.order.update({ where: { id: order.id }, data: { status: 'PAID' } }),
    ]);
    return reply({
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      merchant_confirm_id: order.id,
      error: ERR_OK,
      error_note: 'Success',
    });
  }

  return reply({ error: ERR_SIGN, error_note: 'Unknown action' });
}
