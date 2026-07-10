// Ombor mantiqini JONLI DB'da tekshiradi — LEKIN hamma narsa bitta $transaction
// ichida bajarilib, oxirida ATAYIN rollback qilinadi → hech qanday o'zgarish saqlanmaydi.
// HAQIQIY funksiyalarni chaqiradi (nusxa emas): apps/web/src/lib/inventory-server.ts
//
// Ishga tushirish (repo root'dan): npx tsx scripts/inventory-test.ts

import { readFileSync } from 'node:fs';

import { PrismaClient } from '@prisma/client';

import {
  deductStockForOrder,
  InsufficientStockError,
  restockOrder,
} from '../apps/web/src/lib/inventory-server';

function getDbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync('.env', 'utf8'); // repo root'dan ishga tushiriladi
  const m = /^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m.exec(env);
  if (!m) throw new Error('DATABASE_URL topilmadi (.env)');
  return m[1]!;
}

const prisma = new PrismaClient({ datasources: { db: { url: getDbUrl() } } });

class Rollback extends Error {}

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

async function main() {
  try {
    await prisma.$transaction(
      async (tx) => {
        const inv = await tx.inventoryItem.findFirst({
          where: { quantityOnHand: { gte: 5 } },
          select: { id: true, variantId: true, warehouseId: true, quantityOnHand: true },
        });
        if (!inv) throw new Error('Zaxirasi bor inventar topilmadi — seed kerak.');

        const variant = await tx.productVariant.findUnique({
          where: { id: inv.variantId },
          select: { productId: true, sku: true, product: { select: { name: true } } },
        });
        if (!variant) throw new Error('Varyant topilmadi.');

        const start = inv.quantityOnHand;
        const orderNumber = 'TEST-INV-CHECK';
        const line = {
          productId: variant.productId,
          variantId: inv.variantId,
          inventoryItemId: inv.id,
          warehouseId: inv.warehouseId,
        };
        const readQty = async () =>
          (await tx.inventoryItem.findUnique({
            where: { id: inv.id },
            select: { quantityOnHand: true },
          }))!.quantityOnHand;

        // 1) Oddiy deduct: 3 dona
        await deductStockForOrder(tx, [{ ...line, quantity: 3 }], orderNumber);
        let cur = await readQty();
        check('Deduct 3 → quantityOnHand kamaydi', cur === start - 3, `${start} → ${cur}`);
        const disp1 = await tx.stockMovement.count({
          where: { reference: orderNumber, type: 'DISPATCH' },
        });
        check('DISPATCH StockMovement yozildi', disp1 >= 1, `${disp1} ta`);

        // 2) Oversell: mavjuddan ko'p so'rov → rad etilishi va zaxira o'zgarmasligi kerak
        let rejected = false;
        try {
          await deductStockForOrder(tx, [{ ...line, quantity: 10_000_000 }], orderNumber);
        } catch (e) {
          rejected = e instanceof InsufficientStockError;
        }
        cur = await readQty();
        check('Oversell rad etildi (InsufficientStockError)', rejected);
        check('Rad etilgach zaxira o‘zgarmadi', cur === start - 3, `${cur}`);

        // 3) Chegara: qolganini to‘liq deduct → 0, keyin yana 1 → rad etilishi kerak
        await deductStockForOrder(tx, [{ ...line, quantity: cur }], orderNumber);
        const zero = await readQty();
        check('Qolganini to‘liq deduct → 0', zero === 0, `${zero}`);
        let boundaryRejected = false;
        try {
          await deductStockForOrder(tx, [{ ...line, quantity: 1 }], orderNumber);
        } catch (e) {
          boundaryRejected = e instanceof InsufficientStockError;
        }
        check('0 dan yana 1 deduct → rad etildi (race himoyasi semantikasi)', boundaryRejected);

        // 4) Restock: buyurtma + item yaratamiz (jami deduct = start), keyin qaytaramiz
        const order = await tx.order.create({
          data: {
            number: orderNumber,
            subtotal: 0,
            grandTotal: 0,
            status: 'PENDING',
            items: {
              create: [
                {
                  productId: variant.productId,
                  variantId: inv.variantId,
                  sku: variant.sku,
                  nameSnapshot: variant.product.name as object,
                  quantity: start,
                  unitPrice: 0,
                  totalPrice: 0,
                },
              ],
            },
          },
          select: { id: true },
        });
        const rr = await restockOrder(tx, order.id, orderNumber, 'TEST_RETURN');
        const restored = await readQty();
        check(
          'Restock → boshlang‘ich holatga qaytdi',
          restored === start,
          `0 → ${restored} (start ${start})`,
        );
        check('restockOrder qaytargan miqdor to‘g‘ri', rr.restocked === start, `${rr.restocked}`);
        const ret = await tx.stockMovement.count({
          where: { reference: orderNumber, type: 'RETURN' },
        });
        check('RETURN StockMovement yozildi', ret >= 1, `${ret} ta`);

        // ⛔ Hamma narsani rollback qilamiz — jonli DB'da IZ QOLMAYDI
        throw new Rollback();
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
    console.log('\n=== OMBOR BACKEND TEST (jonli DB, rollback bilan) ===');
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
