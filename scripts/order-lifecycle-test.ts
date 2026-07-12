// H1 — Buyurtma hayotiy sikli (COD) e2e SMOKE, jonli DB'da, oxirida ATAYIN rollback.
// HAQIQIY funksiyalarni chaqiradi (nusxa emas):
//   • apps/web/src/lib/inventory-server.ts  → deductStockForOrder (order-create zaxira kamayishi)
//   • apps/admin/src/lib/fulfillment-server.ts → applyFulfillmentTransition (DELIVERED → COD PAID)
// Bu ikki qadamni bitta yaxlit zanjirда birlashtiradi: yaratish→stock↓→yetkazish→PAID→soldCount↑.
//
// Ishga tushirish (repo root'dan): npx tsx scripts/order-lifecycle-test.ts

import { readFileSync } from 'node:fs';

import { PrismaClient } from '@prisma/client';

import { applyFulfillmentTransition } from '../apps/admin/src/lib/fulfillment-server';
import { deductStockForOrder } from '../apps/web/src/lib/inventory-server';

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

const QTY = 2;
const ORDER_NUMBER = 'TEST-LIFECYCLE-CHECK';

async function main() {
  try {
    await prisma.$transaction(
      async (tx) => {
        // 0) Zaxirasi yetarli (>= QTY) varyantga ega faol mahsulot topamiz
        const product = await tx.product.findFirst({
          where: {
            status: 'ACTIVE',
            deletedAt: null,
            variants: { some: { inventory: { some: { quantityOnHand: { gte: QTY } } } } },
          },
          select: {
            id: true,
            name: true,
            sku: true,
            basePrice: true,
            soldCount: true,
            variants: {
              orderBy: { position: 'asc' },
              select: {
                id: true,
                isActive: true,
                inventory: { select: { id: true, warehouseId: true, quantityOnHand: true } },
              },
            },
          },
        });
        if (!product) throw new Error('Zaxirasi yetarli faol mahsulot topilmadi (seed kerak?).');

        const variant = product.variants.find((v) => v.isActive) ?? product.variants[0]!;
        const inv = variant.inventory[0];
        if (!inv) throw new Error('Varyant inventari topilmadi.');

        const stockBefore = inv.quantityOnHand;
        const soldBefore = product.soldCount;
        const unit = Number(product.basePrice);
        const total = unit * QTY;

        // 1) Buyurtma yaratish (COD, PENDING) — real route kabi variantId saqlanadi
        const created = await tx.order.create({
          data: {
            number: ORDER_NUMBER,
            subtotal: total,
            grandTotal: total,
            status: 'PENDING',
            items: {
              create: [
                {
                  productId: product.id,
                  variantId: variant.id,
                  sku: product.sku,
                  nameSnapshot: product.name as object,
                  quantity: QTY,
                  unitPrice: unit,
                  totalPrice: total,
                },
              ],
            },
            payments: {
              create: [
                {
                  provider: 'CASH_ON_DELIVERY',
                  status: 'PENDING',
                  amount: total,
                  currency: 'UZS',
                },
              ],
            },
          },
          select: { id: true, grandTotal: true, paidAt: true, shippedAt: true },
        });

        // 2) Zaxirani ATOMIK kamaytirish (order-create yo'lidagi haqiqiy funksiya)
        await deductStockForOrder(
          tx,
          [
            {
              productId: product.id,
              variantId: variant.id,
              inventoryItemId: inv.id,
              warehouseId: inv.warehouseId,
              quantity: QTY,
            },
          ],
          ORDER_NUMBER,
        );

        const invAfterDeduct = await tx.inventoryItem.findUnique({
          where: { id: inv.id },
          select: { quantityOnHand: true },
        });
        const dispatch = await tx.stockMovement.findFirst({
          where: { reference: ORDER_NUMBER, type: 'DISPATCH' },
          select: { quantity: true },
        });
        check(
          `Zaxira ${QTY} ga kamaydi`,
          invAfterDeduct?.quantityOnHand === stockBefore - QTY,
          `${stockBefore} → ${invAfterDeduct?.quantityOnHand}`,
        );
        check(
          'DISPATCH StockMovement yozildi',
          dispatch?.quantity === QTY,
          `${dispatch?.quantity}`,
        );

        // 3) Yetkazish: PENDING → DELIVERED (admin fulfillment yon ta'sirlari)
        const res = await applyFulfillmentTransition(
          tx,
          {
            id: created.id,
            status: 'PENDING',
            grandTotal: created.grandTotal,
            paidAt: created.paidAt,
            shippedAt: created.shippedAt,
            items: [{ productId: product.id, quantity: QTY }],
          },
          'DELIVERED',
          { comment: 'e2e smoke' },
        );

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
        const invAfterDeliver = await tx.inventoryItem.findUnique({
          where: { id: inv.id },
          select: { quantityOnHand: true },
        });

        check('DELIVERED → status', delivered?.status === 'DELIVERED', `${delivered?.status}`);
        check('DELIVERED → deliveredAt qo‘yildi', delivered?.deliveredAt != null);
        check('COD → order.paidAt qo‘yildi', delivered?.paidAt != null);
        check('COD → Payment PAID', payment?.status === 'PAID', `${payment?.status}`);
        check('res.codSettled = true', res.codSettled === true);
        check(
          `soldCount += ${QTY}`,
          productAfter?.soldCount === soldBefore + QTY,
          `${soldBefore} → ${productAfter?.soldCount}`,
        );
        check(
          'Yetkazish zaxirani QAYTA oshirmadi',
          invAfterDeliver?.quantityOnHand === stockBefore - QTY,
          `${invAfterDeliver?.quantityOnHand}`,
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
    console.log('\n=== ORDER LIFECYCLE (COD) e2e SMOKE — jonli DB, rollback bilan ===');
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
