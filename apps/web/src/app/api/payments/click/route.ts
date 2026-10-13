// POST /api/payments/click — Click webhook (Prepare & Complete).
// Click hujjati: https://docs.click.uz/click-api-request/
//
// ⚠️ Kerak: CLICK_SECRET_KEY (kassa sirli kaliti). Sandbox'da test qilinadi.
// Click application/x-www-form-urlencoded yuboradi. action: 0=Prepare, 1=Complete.
// Imzo: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id
//          + [merchant_prepare_id] + amount + action + sign_time)

import { createHash, timingSafeEqual } from 'crypto';

import { NextResponse } from 'next/server';

import { Prisma } from '@ecom/database';
import { onOrderPaid } from '@ecom/order-ops';

import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Click javob kodlari
const ERR_OK = 0;
const ERR_SIGN = -1;
const ERR_INCORRECT_AMOUNT = -2;
const ERR_ACTION_NOT_FOUND = -3;
const ERR_ALREADY_PAID = -4;
const ERR_ORDER_NOT_FOUND = -5;
const ERR_REQUEST = -8;
const ERR_TRANS_CANCELLED = -9;

// so'mdagi kichik farqlarni (yaxlitlash) e'tiborsiz qoldirish uchun tolerans
const AMOUNT_EPSILON = 1;

function reply(data: Record<string, unknown>) {
  return NextResponse.json(data);
}

/**
 * Imzolarni doimiy vaqtda taqqoslaydi. Oddiy `!==` birinchi farqli baytda
 * to'xtaydi — bu javob vaqti orqali to'g'ri imzoni bayt-bayt topish
 * (timing attack) imkonini beradi. Uzunlik farq qilsa darhol false.
 */
function signatureMatches(expected: string, received: string): boolean {
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(received, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
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
  // To'lov natijasi (0 = muvaffaqiyatli, manfiy = yiqilgan). Imzo uni QAMRAMAYDI.
  const clickError = get('error');

  // Butun payload (audit/debug uchun rawPayload'ga saqlanadi)
  const rawPayload = Object.fromEntries(
    Array.from(form.entries()).map(([k, v]) => [k, String(v)]),
  ) as Prisma.InputJsonValue;

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
  if (!secret || !signatureMatches(expected, signString)) {
    return reply({ error: ERR_SIGN, error_note: 'SIGN CHECK FAILED' });
  }

  // 2) Amaliyot turini oldindan tekshiramiz (0=Prepare, 1=Complete)
  if (action !== '0' && action !== '1') {
    return reply({ error: ERR_ACTION_NOT_FOUND, error_note: 'Action not found' });
  }

  // 2a) Complete'da Click to'lov natijasini `error` maydonida yuboradi: 0 —
  //     muvaffaqiyatli, manfiy — to'lov yiqilgan yoki bekor qilingan (masalan
  //     -5017: mablag' yetarli emas). Imzo `error`ni qamramagani uchun uni
  //     alohida tekshirmasak, yiqilgan to'lov ham PAID bo'lib qoladi.
  //     Click bu maydonni har doim yuboradi: yo'q yoki butun son bo'lmasa —
  //     so'rov noto'g'ri. Yiqilgan to'lovda buyurtma PENDING qoladi, mijoz
  //     boshqa karta bilan qayta to'lay oladi.
  if (action === '1') {
    const code = Number(clickError);
    if (clickError === '' || !Number.isInteger(code)) {
      return reply({ error: ERR_REQUEST, error_note: 'Error in request from click' });
    }
    if (code < 0) {
      return reply({
        click_trans_id: clickTransId,
        merchant_trans_id: merchantTransId,
        error: ERR_TRANS_CANCELLED,
        error_note: 'Transaction cancelled',
      });
    }
  }

  // 3) Buyurtmani topish
  const order = await prisma.order.findFirst({
    where: { id: merchantTransId },
    select: { id: true, status: true, grandTotal: true },
  });
  if (!order) {
    return reply({ error: ERR_ORDER_NOT_FOUND, error_note: 'Order not found' });
  }

  // 4) Bekor qilingan buyurtmaga to'lov qabul qilinmaydi
  if (order.status === 'CANCELLED' || order.status === 'RETURNED' || order.status === 'REFUNDED') {
    return reply({ error: ERR_TRANS_CANCELLED, error_note: 'Order cancelled' });
  }

  // 5) Summa mosligini tekshirish (so'mda). Noto'g'ri summa — to'lov rad etiladi.
  const amountNum = Number(amount);
  if (
    !Number.isFinite(amountNum) ||
    Math.abs(amountNum - Number(order.grandTotal)) > AMOUNT_EPSILON
  ) {
    return reply({ error: ERR_INCORRECT_AMOUNT, error_note: 'Incorrect amount' });
  }

  // To'lov faqat hali to'lanmagan, jarayonga kirmagan buyurtmaga qabul qilinadi. Ilgari faqat
  // `PAID` tekshirilardi: jo'natilgan/yetkazilgan buyurtmaga kelgan Complete uni qayta PAID'ga
  // tushirib, ikkinchi to'lov yozuvini ochardi (audit Y8).
  const payable = order.status === 'PENDING' || order.status === 'CONFIRMED';

  // 6) Prepare (action=0) — to'lovga tayyorlik
  if (action === '0') {
    if (!payable) {
      return reply({ error: ERR_ALREADY_PAID, error_note: 'Already paid' });
    }
    return reply({
      click_trans_id: clickTransId,
      merchant_trans_id: merchantTransId,
      merchant_prepare_id: order.id,
      error: ERR_OK,
      error_note: 'Success',
    });
  }

  // 7) Complete (action=1) — to'lovni tasdiqlash
  if (!payable) {
    return reply({ error: ERR_ALREADY_PAID, error_note: 'Already paid' });
  }
  const paidAt = new Date();
  // Atomik: buyurtma FAQAT hali to'lanmagan holatdan PAID'ga o'tadi (tekshiruv va yozuv orasida
  // boshqa jarayon o'zgartirgan bo'lsa — 0 qator), keyin Payment yozuvi.
  let completed: boolean;
  try {
    completed = await prisma.$transaction(async (tx) => {
      const moved = await tx.order.updateMany({
        where: { id: order.id, status: { in: ['PENDING', 'CONFIRMED'] }, paidAt: null },
        data: {
          status: 'PAID',
          paidAt,
          // Moliyaviy hisobot uchun: qancha pul haqiqatda tushgani. Buni
          // yozmasak, onlayn to'langan buyurtmalarda paidTotal 0 bo'lib qoladi
          // (admin qo'lda tasdiqlash va COD oqimlari esa uni to'ldiradi).
          paidTotal: order.grandTotal,
        },
      });
      if (moved.count === 0) return false;
      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: 'CLICK',
          status: 'PAID',
          amount: order.grandTotal,
          currency: 'UZS',
          externalId: clickTransId,
          paidAt,
          rawPayload,
        },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: 'PAID', comment: 'Click to‘lovi tasdiqlandi' },
      });
      // Pul tushdi — cashback (audit O1) va sotuvchilarga jo'natmalar (ADR 0015). Idempotent.
      await onOrderPaid(tx, order.id, paidAt);
      return true;
    });
  } catch (e) {
    // Shu click_trans_id allaqachon yozilgan (Click qayta yubordi) — 500 emas, "to'langan".
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return reply({ error: ERR_ALREADY_PAID, error_note: 'Already paid' });
    }
    throw e;
  }
  if (!completed) {
    return reply({ error: ERR_ALREADY_PAID, error_note: 'Already paid' });
  }
  return reply({
    click_trans_id: clickTransId,
    merchant_trans_id: merchantTransId,
    merchant_confirm_id: order.id,
    error: ERR_OK,
    error_note: 'Success',
  });
}
