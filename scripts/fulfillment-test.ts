// Fulfillment mantiqini JONLI DB'da tekshiradi — hamma narsa bitta $transaction ichida
// bajarilib oxirida ATAYIN rollback qilinadi → hech qanday o'zgarish saqlanmaydi.
// HAQIQIY funksiyani chaqiradi: apps/admin/src/lib/fulfillment-server.ts
//
// Ishga tushirish (repo root'dan): npx tsx scripts/fulfillment-test.ts

import { readFileSync } from 'node:fs';

import { PrismaClient } from '@prisma/client';

import {
  applyFulfillmentTransition,
  canTransition,
} from '../apps/admin/src/lib/fulfillment-server';

function getDbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync('.env', 'utf8');
  const m = /^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m.exec(env);
  if (!m) throw new Error('DATABASE_URL topilmadi (.env)');
  return m[1]!;
}

const prisma = new PrismaClient({ datasources: { db: { url: getDbUrl() } } });

class Rollback extends Error {}

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

async function main() {
  // 1) Pure holat-mashina (DB'siz)
  check('canTransition PENDING→CONFIRMED', canTransition('PENDING', 'CONFIRMED') === true);
  check(
    'canTransition PROCESSING→CONFIRMED (orqaga) rad',
    canTransition('PROCESSING', 'CONFIRMED') === false,
  );
  check('canTransition DELIVERED→DELIVERED rad', canTransition('DELIVERED', 'DELIVERED') === false);
  check(
    "canTransition CANCELLED→CONFIRMED (flow'da yo'q) rad",
    canTransition('CANCELLED', 'CONFIRMED') === false,
  );
  check(
    'canTransition PENDING→DELIVERED (oldinga sakrash) ruxsat',
    canTransition('PENDING', 'DELIVERED') === true,
  );

  // 2) DELIVERED yon ta'sirlari — jonli DB, rollback bilan
  try {
    await prisma.$transaction(
      async (tx) => {
        const product = await tx.product.findFirst({
          where: { status: 'ACTIVE', deletedAt: null },
          select: { id: true, name: true, soldCount: true },
        });
        if (!product) throw new Error('Faol mahsulot topilmadi.');
        const soldBefore = product.soldCount;

        // Test COD buyurtmasi: PENDING + PENDING Payment + 1 item (qty 2)
        const created = await tx.order.create({
          data: {
            number: 'TEST-FULFILL-CHECK',
            subtotal: 100_000,
            grandTotal: 100_000,
            status: 'PENDING',
            items: {
              create: [
                {
                  productId: product.id,
                  sku: 'TEST-SKU',
                  nameSnapshot: product.name as object,
                  quantity: 2,
                  unitPrice: 50_000,
                  totalPrice: 100_000,
                },
              ],
            },
            payments: {
              create: [
                {
                  provider: 'CASH_ON_DELIVERY',
                  status: 'PENDING',
                  amount: 100_000,
                  currency: 'UZS',
                },
              ],
            },
          },
          select: {
            id: true,
            grandTotal: true,
            paidAt: true,
            shippedAt: true,
            items: { select: { productId: true, quantity: true } },
          },
        });

        // PENDING → CONFIRMED: yon ta'sir yo'q (to'lov/soldCount o'zgarmaydi)
        await applyFulfillmentTransition(tx, created, 'CONFIRMED', { comment: 'test' });
        const afterConfirm = await tx.order.findUnique({
          where: { id: created.id },
          select: { status: true, paidAt: true },
        });
        check(
          'CONFIRMED → status yangilandi',
          afterConfirm?.status === 'CONFIRMED',
          `${afterConfirm?.status}`,
        );
        check('CONFIRMED → hali to‘lanmagan', afterConfirm?.paidAt === null);

        // CONFIRMED → DELIVERED: COD settle + soldCount + timestamp
        const res = await applyFulfillmentTransition(tx, created, 'DELIVERED', {
          comment: 'yetkazildi',
        });
        const delivered = await tx.order.findUnique({
          where: { id: created.id },
          select: { status: true, deliveredAt: true, paidAt: true, paidTotal: true },
        });
        const payment = await tx.payment.findFirst({
          where: { orderId: created.id },
          select: { status: true, paidAt: true },
        });
        const productAfter = await tx.product.findUnique({
          where: { id: product.id },
          select: { soldCount: true },
        });

        check('DELIVERED → status', delivered?.status === 'DELIVERED', `${delivered?.status}`);
        check('DELIVERED → deliveredAt qo‘yildi', delivered?.deliveredAt != null);
        check('COD → order.paidAt qo‘yildi', delivered?.paidAt != null);
        check(
          'COD → paidTotal = grandTotal',
          Number(delivered?.paidTotal) === 100_000,
          `${delivered?.paidTotal}`,
        );
        check('COD → Payment PAID', payment?.status === 'PAID', `${payment?.status}`);
        check('res.codSettled = true', res.codSettled === true);
        check(
          'soldCount += 2',
          productAfter?.soldCount === soldBefore + 2,
          `${soldBefore} → ${productAfter?.soldCount}`,
        );

        throw new Rollback(); // ⛔ hech narsa saqlanmaydi
      },
      { timeout: 20_000 },
    );
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
}

main()
  .then(() => {
    const pass = results.filter((r) => r.pass).length;
    console.log('\n=== FULFILLMENT BACKEND TEST (jonli DB, rollback bilan) ===');
    for (const r of results) {
      console.log(
        `${r.pass ? 'PASS ✅' : 'FAIL ❌'}  ${r.name}${r.detail ? `  [${r.detail}]` : ''}`,
      );
    }
    console.log(`\nNatija: ${pass}/${results.length} o'tdi. (Barcha yozuvlar rollback qilindi.)`);
    process.exitCode = pass === results.length ? 0 : 1;
  })
  .catch((e) => {
    console.error('TEST XATO:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
