// GET|POST /api/internal/payouts/run — sotuvchilarga to'lovlarni hisoblash (ADR 0015).
//
// Vercel Cron har kuni chaqiradi (`apps/web/vercel.json`), lekin ish faqat to'lov kunlarida
// (standart — oyning 1 va 16-sanasi, Toshkent vaqti; «Marketplace tariflari»da o'zgaradi)
// bajariladi. Qaytarish muddati o'tgan savdolar sotuvchi bo'yicha to'lovga yig'iladi; pulni
// admin bank orqali o'tkazib, «To'lovlar» bo'limida «To'landi» deb belgilaydi.
//
// CRON_SECRET o'rnatilmagan bo'lsa endpoint O'CHIQ (503).

import { timingSafeEqual } from 'node:crypto';

import { runSellerPayouts } from '@ecom/order-ops';
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

  const result = await runSellerPayouts(prisma);
  if (result.created.length > 0) {
    console.info(`[payouts/run] ${result.created.length} ta sotuvchiga to'lov hisoblandi`);
  }
  return NextResponse.json({ success: true, data: result });
}

export const GET = handle;
export const POST = handle;
