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

import { Prisma } from '@ecom/database';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { reverseOrderLoyalty } from '@/lib/loyalty-server';

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
  // format: "Paycom:<KEY>"
  return decoded === `Paycom:${key}`;
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

      const paidAt = new Date();
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'PAID', paidAt },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: {
            status: 'PAID',
            paidAt,
            statusHistory: { create: { status: 'PAID', comment: 'Payme to‘lovi tasdiqlandi' } },
          },
        }),
      ]);
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
          paidAt: true,
          failedAt: true,
          rawPayload: true,
        },
      })) as Pick<
        PaymentRow,
        'id' | 'orderId' | 'status' | 'paidAt' | 'failedAt' | 'rawPayload'
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

      // Order + user (perform qilingan to'lov bekor qilinsa loyalty qaytariladi)
      const order = await prisma.order.findUnique({
        where: { id: payment.orderId },
        select: { id: true, number: true, userId: true },
      });

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
            statusHistory: {
              create: {
                status: wasPerformed ? 'REFUNDED' : 'CANCELLED',
                comment: `Payme bekor qildi (reason: ${reason ?? '—'})`,
              },
            },
          },
        });
        // Perform qilingandan keyin bekor — Sello Coins qaytariladi
        if (wasPerformed && order?.userId) {
          await reverseOrderLoyalty(tx, order.userId, order.number);
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
