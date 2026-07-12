// H3 — Oversell concurrency SMOKE. stock=1 da N ta PARALLEL alohida tranzaksiya buyurtma qiladi;
// atomik shartli UPDATE (deductStockForOrder) tufayli AYNAN 1 tasi o'tishi, qolganlari
// InsufficientStockError olishi shart. Concurrency real yozuvni talab qiladi (bitta rollback tx
// emas), shuning uchun REAL mahsulot stock'iga tegmaslik uchun BIR MARTALIK "throwaway" variant +
// inventar (stock=1) yaratamiz, sinaymiz va oxirida O'CHIRAMIZ (variant cascade → inventar; movement
// reference bo'yicha). HAQIQIY funksiya: apps/web/src/lib/inventory-server.ts → deductStockForOrder.
//
// Ishga tushirish (repo root'dan): npx tsx scripts/oversell-concurrency-test.ts

import { readFileSync } from 'node:fs';

import { PrismaClient } from '@prisma/client';

import { deductStockForOrder, InsufficientStockError } from '../apps/web/src/lib/inventory-server';

function getDbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const env = readFileSync('.env', 'utf8');
  const m = /^DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/m.exec(env);
  if (!m) throw new Error('DATABASE_URL topilmadi (.env)');
  return m[1]!;
}

const prisma = new PrismaClient({ datasources: { db: { url: getDbUrl() } } });

const results: { name: string; pass: boolean; detail: string }[] = [];
const check = (name: string, pass: boolean, detail = '') => results.push({ name, pass, detail });

const N = 5; // parallel buyurtmalar
const REF_PREFIX = 'OVERSELL-TEST-';

async function main() {
  // throwaway variant + inventar (mavjud mahsulot va ombor asosida)
  const product = await prisma.product.findFirst({
    where: { status: 'ACTIVE', deletedAt: null },
    select: { id: true },
  });
  if (!product) throw new Error('Faol mahsulot topilmadi.');
  const anyInv = await prisma.inventoryItem.findFirst({ select: { warehouseId: true } });
  if (!anyInv) throw new Error('Hech qanday inventar topilmadi (seed kerak?).');

  let variantId: string | null = null;
  try {
    const variant = await prisma.productVariant.create({
      data: { productId: product.id, sku: `TEST-OVERSELL-${Date.now()}` },
      select: { id: true },
    });
    variantId = variant.id;
    const invItem = await prisma.inventoryItem.create({
      data: { warehouseId: anyInv.warehouseId, variantId: variant.id, quantityOnHand: 1 },
      select: { id: true },
    });

    const line = {
      productId: product.id,
      variantId: variant.id,
      inventoryItemId: invItem.id,
      warehouseId: anyInv.warehouseId,
      quantity: 1,
    };

    // N ta parallel, HAR BIRI alohida $transaction
    const attempts = Array.from({ length: N }, (_, i) =>
      prisma
        .$transaction((tx) => deductStockForOrder(tx, [line], `${REF_PREFIX}${i}`))
        .then(() => 'ok' as const)
        .catch((e) => {
          if (e instanceof InsufficientStockError) return 'insufficient' as const;
          throw e;
        }),
    );
    const outcomes = await Promise.all(attempts);
    const ok = outcomes.filter((o) => o === 'ok').length;
    const insufficient = outcomes.filter((o) => o === 'insufficient').length;

    const finalInv = await prisma.inventoryItem.findUnique({
      where: { id: invItem.id },
      select: { quantityOnHand: true },
    });
    const dispatches = await prisma.stockMovement.count({
      where: { reference: { startsWith: REF_PREFIX }, type: 'DISPATCH' },
    });

    check(`${N} parallel buyurtmadan AYNAN 1 tasi o'tdi`, ok === 1, `ok=${ok}`);
    check(
      `qolgan ${N - 1} tasi InsufficientStock`,
      insufficient === N - 1,
      `insufficient=${insufficient}`,
    );
    check(
      'Yakuniy zaxira = 0 (oversell yo‘q)',
      finalInv?.quantityOnHand === 0,
      `${finalInv?.quantityOnHand}`,
    );
    check('Faqat 1 ta DISPATCH movement yozildi', dispatches === 1, `${dispatches}`);
  } finally {
    // Tozalash: test movement'lari + throwaway variant (cascade → inventar)
    await prisma.stockMovement.deleteMany({ where: { reference: { startsWith: REF_PREFIX } } });
    if (variantId) await prisma.productVariant.delete({ where: { id: variantId } }).catch(() => {});
  }
}

main()
  .then(() => {
    const pass = results.filter((r) => r.pass).length;
    console.log(
      '\n=== OVERSELL CONCURRENCY SMOKE — stock=1, N parallel (throwaway, tozalandi) ===',
    );
    for (const r of results) {
      console.log(
        `${r.pass ? 'PASS ✅' : 'FAIL ❌'}  ${r.name}${r.detail ? `  [${r.detail}]` : ''}`,
      );
    }
    console.log(`\nNatija: ${pass}/${results.length} o'tdi.`);
    process.exitCode = pass === results.length ? 0 : 1;
  })
  .catch((e) => {
    console.error('TEST XATO:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
