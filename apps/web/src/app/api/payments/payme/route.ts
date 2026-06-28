// POST /api/payments/payme — Payme Merchant API (JSON-RPC 2.0).
// Hujjat: https://developer.help.paycom.uz/protokol-merchant-api/
//
// ⚠️ Kerak: PAYME_KEY (kassa kaliti). Sandbox'da test qilinadi.
// Avtorizatsiya: header "Authorization: Basic base64('Paycom:' + PAYME_KEY)".
// Account: ac.order_id orqali buyurtmaga bog'lanadi. amount — tiyinda (so'm × 100).
//
// Holatlar: 1 = yaratilgan (kutilmoqda), 2 = to'langan, -1/-2 = bekor qilingan.
// ESLATMA: bu skelet asosiy oqimni qamraydi; to'liq edge-case'lar (timeout, qisman
// holatlar, GetStatement) sandbox testida yakunlanadi.

import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Payme xato kodlari
const E_AUTH = -32504;
const E_METHOD = -32601;
const E_ORDER = -31050; // buyurtma topilmadi (merchant tomonidan belgilanadi)
const E_AMOUNT = -31001;
const E_TX_NOT_FOUND = -31003;

function rpc(id: unknown, result: Record<string, unknown>) {
  return NextResponse.json({ jsonrpc: '2.0', id, result });
}
function rpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } });
}

function checkAuth(req: NextRequest): boolean {
  const key = process.env.PAYME_KEY ?? '';
  const header = req.headers.get('authorization') ?? '';
  if (!key || !header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  // format: "Paycom:<KEY>"
  return decoded === `Paycom:${key}`;
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
      const order = await prisma.order.findFirst({
        where: { id: orderId },
        select: { id: true, grandTotal: true, status: true },
      });
      if (!order) return rpcError(id, E_ORDER, 'Order not found');
      if (Math.round(Number(order.grandTotal) * 100) !== amountTiyin) {
        return rpcError(id, E_AMOUNT, 'Incorrect amount');
      }
      return rpc(id, { allow: true });
    }

    // 2) Tranzaksiya yaratish
    case 'CreateTransaction': {
      const order = await prisma.order.findFirst({
        where: { id: orderId },
        select: { id: true, grandTotal: true },
      });
      if (!order) return rpcError(id, E_ORDER, 'Order not found');

      // Mavjud bo'lsa qaytaramiz, bo'lmasa yaratamiz (idempotent)
      let payment = await prisma.payment.findFirst({
        where: { provider: 'PAYME', externalId: paymeTxId },
        select: { id: true, createdAt: true },
      });
      if (!payment) {
        payment = await prisma.payment.create({
          data: {
            orderId: order.id,
            provider: 'PAYME',
            status: 'PENDING',
            amount: order.grandTotal,
            externalId: paymeTxId,
          },
          select: { id: true, createdAt: true },
        });
      }
      return rpc(id, {
        create_time: payment.createdAt.getTime(),
        transaction: payment.id,
        state: 1,
      });
    }

    // 3) To'lovni yakunlash
    case 'PerformTransaction': {
      const payment = await prisma.payment.findFirst({
        where: { provider: 'PAYME', externalId: paymeTxId },
        select: { id: true, orderId: true, status: true, paidAt: true },
      });
      if (!payment) return rpcError(id, E_TX_NOT_FOUND, 'Transaction not found');

      if (payment.status !== 'PAID') {
        const paidAt = new Date();
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'PAID', paidAt },
          }),
          prisma.order.update({ where: { id: payment.orderId }, data: { status: 'PAID' } }),
        ]);
        return rpc(id, { transaction: payment.id, perform_time: paidAt.getTime(), state: 2 });
      }
      return rpc(id, {
        transaction: payment.id,
        perform_time: (payment.paidAt ?? new Date()).getTime(),
        state: 2,
      });
    }

    // 4) Tranzaksiyani bekor qilish
    case 'CancelTransaction': {
      const payment = await prisma.payment.findFirst({
        where: { provider: 'PAYME', externalId: paymeTxId },
        select: { id: true, orderId: true },
      });
      if (!payment) return rpcError(id, E_TX_NOT_FOUND, 'Transaction not found');
      const cancelTime = new Date();
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'CANCELLED', failedAt: cancelTime },
        }),
        prisma.order.update({ where: { id: payment.orderId }, data: { status: 'CANCELLED' } }),
      ]);
      return rpc(id, { transaction: payment.id, cancel_time: cancelTime.getTime(), state: -1 });
    }

    // 5) Holatni tekshirish
    case 'CheckTransaction': {
      const payment = await prisma.payment.findFirst({
        where: { provider: 'PAYME', externalId: paymeTxId },
        select: { id: true, status: true, createdAt: true, paidAt: true, failedAt: true },
      });
      if (!payment) return rpcError(id, E_TX_NOT_FOUND, 'Transaction not found');
      const state = payment.status === 'PAID' ? 2 : payment.status === 'CANCELLED' ? -1 : 1;
      return rpc(id, {
        create_time: payment.createdAt.getTime(),
        perform_time: payment.paidAt?.getTime() ?? 0,
        cancel_time: payment.failedAt?.getTime() ?? 0,
        transaction: payment.id,
        state,
        reason: null,
      });
    }

    default:
      return rpcError(id, E_METHOD, 'Method not found');
  }
}
