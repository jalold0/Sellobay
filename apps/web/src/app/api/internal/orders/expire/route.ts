// GET|POST /api/internal/orders/expire — to'lanmagan buyurtmalarni avtomatik bekor qilish (audit K4).
//
// Cron chaqiradi (Vercel Cron — `apps/web/vercel.json`; Vercel `CRON_SECRET` env'i bo'lsa
// `Authorization: Bearer <CRON_SECRET>` sarlavhasini o'zi qo'shadi). Qoida va muddatlar —
// @ecom/core-domain `order-expiry` (Click/Payme 12 soat, rad etilgan chek 24 soat).
//
// CRON_SECRET o'rnatilmagan bo'lsa endpoint O'CHIQ (503) — tashqaridan hech kim
// buyurtmalarni bekor qila olmaydi.

import { timingSafeEqual } from 'node:crypto';

import { expireUnpaidOrders } from '@ecom/order-ops';
import { getPushService } from '@ecom/push';
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(req: NextRequest, secret: string): boolean {
  const header = req.headers.get('authorization') ?? '';
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { success: false, error: { code: 'DISABLED', message: 'CRON_SECRET sozlanmagan' } },
      { status: 503 },
    );
  }
  if (!authorized(req, secret)) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Ruxsat yo‘q' } },
      { status: 401 },
    );
  }

  const result = await expireUnpaidOrders(prisma);

  // Push COMMIT'DAN KEYIN; xato tashlamaydi.
  const push = getPushService();
  for (const o of result.expired) await push.notifyOrderStatus(o.id, 'CANCELLED');

  if (result.expired.length > 0) {
    console.info(
      `[orders/expire] ${result.expired.length} ta to'lanmagan buyurtma bekor qilindi`,
      result.expired.map((o) => o.number),
    );
  }
  return NextResponse.json({
    success: true,
    data: { checked: result.checked, expired: result.expired.map((o) => o.number) },
  });
}

export const GET = handle;
export const POST = handle;
