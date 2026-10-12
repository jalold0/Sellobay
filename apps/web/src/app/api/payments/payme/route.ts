// POST /api/payments/payme — Payme Merchant API (JSON-RPC 2.0).
// Hujjat: https://developer.help.paycom.uz/protokol-merchant-api/
//
// ⚠️ Kerak: PAYME_KEY (kassa kaliti). Sandbox'da test qilinadi.
// Avtorizatsiya: header "Authorization: Basic base64('Paycom:' + PAYME_KEY)".
// Account: ac.order_id orqali buyurtmaga bog'lanadi. amount — tiyinda (so'm × 100).
//
// Payme tranzaksiya holatlari (Payment.status → Payme state):
//   PENDING   → 1  (yaratilgan, kutilmoqda)
//   PAID      → 2  (perform qilingan)
//   CANCELLED → -1 (perform'gacha bekor) yoki -2 (perform'dan keyin bekor/refund)
//   -1/-2 farqi paidAt mavjudligi bilan aniqlanadi.

import { timingSafeEqual } from 'crypto';

import { grantOrderEarnForOrder } from '@ecom/order-ops';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { releaseCancelledOrder } from '@/lib/order-release-server';

import type { Prisma } from '@ecom/database';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Payme xato kodlari
const E_AUTH = -32504;
const E_METHOD = -32601;
const E_ORDER = -31050; // buyurtma topilmadi (account xatosi, -31050..-31099)
const E_ORDER_STATE = -31052; // buyurtma to'lovga yaroqsiz / boshqa aktiv tranzaksiya bor
const E_AMOUNT = -31001;
const E_TX_NOT_FOUND = -31003;
const E_CANNOT_PERFORM = -31008; // amalni bajarib bo'lmadi (masalan timeout)

// Tranzaksiya yaroqlilik muddati — 12 soat
const TX_TIMEOUT_MS = 12 * 60 * 60 * 1000;
// Timeout tufayli avto-bekor qilish sababi (Payme reason kodi)
const REASON_TIMEOUT = 4;

// Buyurtma to'lovga yaroqli holatlar (perform'gacha)
const PAYABLE_STATUSES = ['PENDING', 'CONFIRMED'] as const;

/** Perform paytida buyurtma to'lab bo'lmaydigan holatga o'tgan — tranzaksiya rollback qilinadi. */
class PerformRaceError extends Error {}

type PaymentRow = {
  id: string;
  orderId: string;
  status: string;
  createdAt: Date;
  paidAt: Date | null;
  failedAt: Date | null;
  amount: Prisma.Decimal;
  rawPayload: Prisma.JsonValue;
};

function rpc(id: unknown, result: Record<string, unknown>) {
  return NextResponse.json({ jsonrpc: '2.0', id, result });
}
function rpcError(id: unknown, code: number, message: string, data?: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message, data } });
}

function checkAuth(req: NextRequest): boolean {
  const key = process.env.PAYME_KEY ?? '';
  const header = req.headers.get('authorization') ?? '';
  if (!key || !header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  // format: "Paycom:<KEY>". Taqqoslash doimiy vaqtda — oddiy `===` birinchi
  // farqli baytda to'xtaydi va javob vaqti orqali kalitni bayt-bayt topish
  // (timing attack) imkonini beradi.
  const expected = Buffer.from(`Paycom:${key}`, 'utf8');
  const received = Buffer.from(decoded, 'utf8');
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

/** Payment.status + paidAt'dan Payme tranzaksiya state'i */
function stateOf(p: Pick<PaymentRow, 'status' | 'paidAt'>): number {
  if (p.status === 'PAID') return 2;
  if (p.status === 'CANCELLED') return p.paidAt ? -2 : -1;
  return 1;
}

/** rawPayload'dan (obyekt bo'lsa) saqlangan cancel reason */
function cancelReasonOf(raw: Prisma.JsonValue): number | null {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = (raw as Record<string, unknown>).cancelReason;
    if (typeof r === 'number') return r;
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return rpcError(null, E_AUTH, 'Insufficient privileges');
  }

  const body = (await req.json().catch(() => null)) as {
    id?: unknown;
    method?: string;
    params?: Record<string, unknown>;
  } | null;
  if (!body?.method) return rpcError(body?.id ?? null, E_METHOD, 'Invalid request');

  const { id, method, params = {} } = body;
  const account = (params.account as Record<string, string>) ?? {};
  const orderId = account.order_id ?? '';
  const amountTiyin = Number(params.amount ?? 0);
  const paymeTxId = String(params.id ?? '');

  switch (method) {
    // 1) To'lovni amalga oshirish mumkinmi
    case 'CheckPerformTransaction': {
      if (!orderId) return rpcError(id, E_ORDER, 'Order not found');
      const order = await prisma.order.findFirst({
        where: { id: orderId },
        select: { id: true, grandTotal: true, status: true },
      });
      if (!order) return rpcError(id, E_ORDER, 'Order not found');
      if (Math.round(Number(order.grandTotal) * 100) !== amountTiyin) {
        return rpcError(id, E_AMOUNT, 'Incorrect amount');
      }
      if (!PAYABLE_STATUSES.includes(order.status as (typeof PAYABLE_STATUSES)[number])) {
        return rpcError(id, E_ORDER_STATE, 'Order is not payable');
      }
      return rpc(id, { allow: true });
    }

    // 2) Tranzaksiya yaratish
    case 'CreateTransaction': {
      // Idempotent: shu paymeTxId allaqachon bo'lsa — mavjudini qaytaramiz
      const existing = (await prisma.payment.findFirst({
        where: { provider: 'PAYME', externalId: paymeTxId },
        select: { id: true, orderId: true, status: true, createdAt: true, paidAt: true },
      })) as Pick<PaymentRow, 'id' | 'orderId' | 'status' | 'createdAt' | 'paidAt'> | null;
      if (existing) {
        return rpc(id, {
          create_time: existing.createdAt.getTime(),
          transaction: existing.id,
          state: stateOf(existing),
        });
      }

      if (!orderId) return rpcError(id, E_ORDER, 'Order not found');
      const order = await prisma.order.findFirst({
        where: { id: orderId },
        select: { id: true, grandTotal: true, status: true },
      });
      if (!order) return rpcError(id, E_ORDER, 'Order not found');
      if (Math.round(Number(order.grandTotal) * 100) !== amountTiyin) {
        return rpcError(id, E_AMOUNT, 'Incorrect amount');
      }
      if (!PAYABLE_STATUSES.includes(order.status as (typeof PAYABLE_STATUSES)[number])) {
        return rpcError(id, E_ORDER_STATE, 'Order is not payable');
      }
      // Bitta buyurtma — bitta aktiv tranzaksiya (boshqa PENDING/PAID Payme tx bo'lmasin)
      const activeOther = await prisma.payment.findFirst({
        where: {
          orderId: order.id,
          provider: 'PAYME',
          status: { in: ['PENDING', 'PAID'] },
          externalId: { not: paymeTxId },
        },
        select: { id: true },
      });
      if (activeOther) {
        return rpcError(id, E_ORDER_STATE, 'Order already has an active transaction');
      }

      const created = await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'PAYME',
          status: 'PENDING',
          amount: order.grandTotal,
          currency: 'UZS',
          externalId: paymeTxId,
          rawPayload: (params ?? {}) as Prisma.InputJsonValue,
        },
        select: { id: true, createdAt: true },
      });
      return rpc(id, {
        create_time: created.createdAt.getTime(),
        transaction: created.id,
        state: 1,
      });
    }

    // 3) To'lovni yakunlash
    case 'PerformTransaction': {
      const payment = (await prisma.payment.findFirst({
        where: { provider: 'PAYME', externalId: paymeTxId },
        select: {
          id: true,
          orderId: true,
          status: true,
          createdAt: true,
          paidAt: true,
        },
      })) as Pick<PaymentRow, 'id' | 'orderId' | 'status' | 'createdAt' | 'paidAt'> | null;
      if (!payment) return rpcError(id, E_TX_NOT_FOUND, 'Transaction not found');

      if (payment.status === 'PAID') {
        return rpc(id, {
          transaction: payment.id,
          perform_time: (payment.paidAt ?? new Date()).getTime(),
          state: 2,
        });
      }
      if (payment.status === 'CANCELLED') {
        return rpcError(id, E_CANNOT_PERFORM, 'Transaction cancelled');
      }
      // Timeout — 12 soatdan oshgan PENDING tranzaksiya avto-bekor qilinadi
      if (Date.now() - payment.createdAt.getTime() > TX_TIMEOUT_MS) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CANCELLED',
            failedAt: new Date(),
            rawPayload: { cancelReason: REASON_TIMEOUT } as Prisma.InputJsonValue,
          },
        });
        return rpcError(id, E_CANNOT_PERFORM, 'Transaction timed out');
      }

      // Buyurtma holatini QAYTA tekshiramiz. CreateTransaction'dan keyin mijoz
      // buyurtmani bekor qilgan bo'lishi mumkin (zaxira qaytarilgan, Sello Coins
      // qaytarilgan, promokod bo'shatilgan) — bunday buyurtmani PAID qilib
      // qo'ysak, to'lov olinadi-yu buyurtma bajarilmaydi. Click webhook'i ham
      // shu tekshiruvni qiladi (ERR_TRANS_CANCELLED).
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        select: { status: true, grandTotal: true },
      });
      if (!order) return rpcError(id, E_ORDER, 'Order not found');
      if (!PAYABLE_STATUSES.includes(order.status as (typeof PAYABLE_STATUSES)[number])) {
        return rpcError(id, E_CANNOT_PERFORM, 'Order is no longer payable');
      }

      const paidAt = new Date();
      // ATOMIK: tekshiruv va yozuv orasida buyurtma bekor qilingan yoki tranzaksiya boshqa
      // so'rovda yopilgan bo'lishi mumkin (audit P6). Ikkala yozuv ham shartli — biri o'tmasa
      // hammasi qaytariladi va Payme'ga «bajarib bo'lmaydi» javobi ketadi.
      const performed = await prisma
        .$transaction(async (tx) => {
          const p = await tx.payment.updateMany({
            where: { id: payment.id, status: 'PENDING' },
            data: { status: 'PAID', paidAt },
          });
          if (p.count === 0) return false;
          const o = await tx.order.updateMany({
            where: { id: payment.orderId, status: { in: [...PAYABLE_STATUSES] }, paidAt: null },
            data: { status: 'PAID', paidAt, paidTotal: order.grandTotal },
          });
          if (o.count === 0) throw new PerformRaceError();
          await tx.orderStatusHistory.create({
            data: {
              orderId: payment.orderId,
              status: 'PAID',
              comment: 'Payme to‘lovi tasdiqlandi',
            },
          });
          // Pul tushdi — cashback endi (audit O1). Idempotent.
          await grantOrderEarnForOrder(tx, payment.orderId);
          return true;
        })
        .catch((e: unknown) => {
          if (e instanceof PerformRaceError) return null;
          throw e;
        });
      if (performed === null) return rpcError(id, E_CANNOT_PERFORM, 'Order is no longer payable');
      if (!performed) {
        // Parallel so'rov allaqachon bajargan — Payme protokoli bo'yicha o'sha natija qaytadi.
        const done = await prisma.payment.findUnique({
          where: { id: payment.id },
          select: { status: true, paidAt: true },
        });
        if (done?.status === 'PAID') {
          return rpc(id, {
            transaction: payment.id,
            perform_time: (done.paidAt ?? paidAt).getTime(),
            state: 2,
          });
        }
        return rpcError(id, E_CANNOT_PERFORM, 'Transaction cancelled');
      }
      return rpc(id, { transaction: payment.id, perform_time: paidAt.getTime(), state: 2 });
    }

    // 4) Tranzaksiyani bekor qilish (state -1 perform'gacha, -2 perform'dan keyin)
    case 'CancelTransaction': {
      const reason = Number(params.reason ?? 0) || null;
      const payment = (await prisma.payment.findFirst({
        where: { provider: 'PAYME', externalId: paymeTxId },
        select: {
          id: true,
          orderId: true,
          status: true,
          amount: true,
          paidAt: true,
          failedAt: true,
          rawPayload: true,
        },
      })) as Pick<
        PaymentRow,
        'id' | 'orderId' | 'status' | 'amount' | 'paidAt' | 'failedAt' | 'rawPayload'
      > | null;
      if (!payment) return rpcError(id, E_TX_NOT_FOUND, 'Transaction not found');

      // Allaqachon bekor qilingan — idempotent
      if (payment.status === 'CANCELLED') {
        return rpc(id, {
          transaction: payment.id,
          cancel_time: (payment.failedAt ?? new Date()).getTime(),
          state: payment.paidAt ? -2 : -1,
        });
      }

      const wasPerformed = payment.status === 'PAID';
      const cancelTime = new Date();
      const rawObj =
        payment.rawPayload &&
        typeof payment.rawPayload === 'object' &&
        !Array.isArray(payment.rawPayload)
          ? (payment.rawPayload as Record<string, unknown>)
          : {};

      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        select: {
          id: true,
          number: true,
          userId: true,
          promoCode: true,
          status: true,
          paidTotal: true,
        },
      });
      // Tovar hali omborda (jo'natilmagan) bo'lsa zaxira qaytariladi. Yo'lga chiqqan yoki
      // yetkazilgan bo'lsa — tovar mijozda/kuryerda, uni qaytarish oqimi alohida.
      const goodsStillInStock =
        order != null && !['SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status);

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'CANCELLED',
            failedAt: cancelTime,
            rawPayload: { ...rawObj, cancelReason: reason } as Prisma.InputJsonValue,
          },
        });
        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            status: wasPerformed ? 'REFUNDED' : 'CANCELLED',
            cancelledAt: cancelTime,
            // Perform qilingan to'lov qaytarilsa — moliyaviy iz qoldiriladi:
            // refundedTotal to'ldiriladi, paidTotal nolga tushadi (pul bizda emas).
            ...(wasPerformed
              ? { refundedTotal: order?.paidTotal ?? payment.amount, paidTotal: 0 }
              : {}),
            statusHistory: {
              create: {
                status: wasPerformed ? 'REFUNDED' : 'CANCELLED',
                comment: `Payme bekor qildi (reason: ${reason ?? '—'})`,
              },
            },
          },
        });
        // Zaxira, Sello Coins (perform'gacha bekor qilinsa ham — coin buyurtma yaratilganda
        // berilgan), promokod, kuryer topshirig'i. Ilgari faqat perform'dan keyin coin
        // qaytarilardi, zaxira va promo esa umuman qaytmasdi (audit Y7).
        if (order) {
          await releaseCancelledOrder(tx, order, {
            restock: goodsStillInStock,
            reason: wasPerformed ? 'PAYME_REFUND' : 'PAYME_CANCEL',
          });
        }
      });

      return rpc(id, {
        transaction: payment.id,
        cancel_time: cancelTime.getTime(),
        state: wasPerformed ? -2 : -1,
      });
    }

    // 5) Holatni tekshirish
    case 'CheckTransaction': {
      const payment = (await prisma.payment.findFirst({
        where: { provider: 'PAYME', externalId: paymeTxId },
        select: {
          id: true,
          status: true,
          createdAt: true,
          paidAt: true,
          failedAt: true,
          rawPayload: true,
        },
      })) as Pick<
        PaymentRow,
        'id' | 'status' | 'createdAt' | 'paidAt' | 'failedAt' | 'rawPayload'
      > | null;
      if (!payment) return rpcError(id, E_TX_NOT_FOUND, 'Transaction not found');
      return rpc(id, {
        create_time: payment.createdAt.getTime(),
        perform_time: payment.paidAt?.getTime() ?? 0,
        cancel_time: payment.failedAt?.getTime() ?? 0,
        transaction: payment.id,
        state: stateOf(payment),
        reason: cancelReasonOf(payment.rawPayload),
      });
    }

    // 6) Hisobot — vaqt oralig'idagi tranzaksiyalar (sertifikatsiya uchun)
    case 'GetStatement': {
      const from = Number(params.from ?? 0);
      const to = Number(params.to ?? 0);
      const payments = (await prisma.payment.findMany({
        where: {
          provider: 'PAYME',
          externalId: { not: null },
          createdAt: { gte: new Date(from), lte: new Date(to) },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          orderId: true,
          externalId: true,
          amount: true,
          status: true,
          createdAt: true,
          paidAt: true,
          failedAt: true,
          rawPayload: true,
        },
      })) as Array<
        Pick<
          PaymentRow,
          | 'id'
          | 'orderId'
          | 'status'
          | 'amount'
          | 'createdAt'
          | 'paidAt'
          | 'failedAt'
          | 'rawPayload'
        > & { externalId: string | null }
      >;
      return rpc(id, {
        transactions: payments.map((p) => ({
          id: p.externalId,
          time: p.createdAt.getTime(),
          amount: Math.round(Number(p.amount) * 100),
          account: { order_id: p.orderId },
          create_time: p.createdAt.getTime(),
          perform_time: p.paidAt?.getTime() ?? 0,
          cancel_time: p.failedAt?.getTime() ?? 0,
          transaction: p.id,
          state: stateOf(p),
          reason: cancelReasonOf(p.rawPayload),
        })),
      });
    }

    default:
      return rpcError(id, E_METHOD, 'Method not found');
  }
}
