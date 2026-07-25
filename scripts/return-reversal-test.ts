// H2 — Qaytarish (return) reversal SMOKE, jonli DB'da, oxirida ATAYIN rollback.
// Return route'dagi HAQIQIY funksiyalarni chaqiradi (apps/web/.../orders/[id]/return/route.ts):
//   • inventory-server.restockOrder      → zaxira qaytadi + RETURN StockMovement
//   • loyalty-server.reverseOrderLoyalty → Sello Coins cashback revoke + ishlatilgan coin refund
//   • promokod bekor (route'dagi inline mantiq ayni takrorlanadi): usedCount↓ + UserCoupon.redeemedAt=null
//
// Ishga tushirish (repo root'dan): npx tsx scripts/return-reversal-test.ts

import { readFileSync } from 'node:fs';

import { PrismaClient } from '@prisma/client';

import { deductStockForOrder, restockOrder } from '../apps/web/src/lib/inventory-server';
import { reverseOrderLoyalty } from '../apps/web/src/lib/loyalty-server';

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
const EARN = 50;
const REDEEM = 30;
const BASE_POINTS = 1000;
const ORDER_NUMBER = 'TEST-RETURN-CHECK';
const PROMO = 'TEST-RET-COUPON';

async function main() {
  try {
    await prisma.$transaction(
      async (tx) => {
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
        if (!product) throw new Error('Zaxirasi yetarli faol mahsulot topilmadi.');
        const variant = product.variants.find((v) => v.isActive) ?? product.variants[0]!;
        const inv = variant.inventory[0];
        if (!inv) throw new Error('Varyant inventari topilmadi.');

        const user = await tx.user.findFirst({ select: { id: true } });
        if (!user) throw new Error('Foydalanuvchi topilmadi (seed kerak?).');

        const stockBefore = inv.quantityOnHand;
        const unit = Number(product.basePrice);
        const total = unit * QTY;

        // Baza holat: loyaltyPoints ni ma'lum qiymatga qo'yamiz (undo salbiy → clamp bo'lmasin)
        await tx.user.update({ where: { id: user.id }, data: { loyaltyPoints: BASE_POINTS } });

        // Promokod + UserCoupon (redeemed) sozlaymiz
        const promo = await tx.promoCode.create({
          data: { code: PROMO, type: 'PERCENT', value: 10, usedCount: 1 },
          select: { id: true },
        });
        await tx.userCoupon.create({
          data: { userId: user.id, promoCodeId: promo.id, redeemedAt: new Date() },
        });

        // Buyurtma (DELIVERED, promokodli) + zaxira kamayadi
        const order = await tx.order.create({
          data: {
            number: ORDER_NUMBER,
            subtotal: total,
            grandTotal: total,
            status: 'DELIVERED',
            promoCode: PROMO,
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
          },
          select: { id: true, number: true },
        });
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

        // Loyalty: ORDER_EARN (+50) va ORDER_SPEND (−30) — order.number'ga bog'liq
        await tx.loyaltyTransaction.createMany({
          data: [
            { userId: user.id, points: EARN, reason: 'ORDER_EARN', reference: ORDER_NUMBER },
            { userId: user.id, points: -REDEEM, reason: 'ORDER_SPEND', reference: ORDER_NUMBER },
          ],
        });

        // ── Endi RETURN reversal (route bilan bir xil tartib) ──
        const stock = await restockOrder(tx, order.id, order.number, 'ORDER_RETURNED');
        const invAfter = await tx.inventoryItem.findUnique({
          where: { id: inv.id },
          select: { quantityOnHand: true },
        });
        const returnMove = await tx.stockMovement.findFirst({
          where: { reference: ORDER_NUMBER, type: 'RETURN' },
          select: { quantity: true },
        });
        check(`restockOrder → ${QTY} qaytdi`, stock.restocked === QTY, `${stock.restocked}`);
        check('restockOrder → skipped bo‘sh', stock.skipped.length === 0);
        check(
          'Zaxira asl holatga tiklandi',
          invAfter?.quantityOnHand === stockBefore,
          `${stockBefore - QTY} → ${invAfter?.quantityOnHand} (asl ${stockBefore})`,
        );
        check(
          'RETURN StockMovement yozildi',
          returnMove?.quantity === QTY,
          `${returnMove?.quantity}`,
        );

        const loyalty = await reverseOrderLoyalty(tx, user.id, order.number);
        const userAfter = await tx.user.findUnique({
          where: { id: user.id },
          select: { loyaltyPoints: true },
        });
        check(`loyalty.refunded = ${REDEEM}`, loyalty.refunded === REDEEM, `${loyalty.refunded}`);
        check(`loyalty.revoked = ${EARN}`, loyalty.revoked === EARN, `${loyalty.revoked}`);
        check(
          'loyaltyPoints teskari qilindi (redeem−earn)',
          userAfter?.loyaltyPoints === BASE_POINTS + (REDEEM - EARN),
          `${BASE_POINTS} → ${userAfter?.loyaltyPoints} (kutilgan ${BASE_POINTS + (REDEEM - EARN)})`,
        );

        // Promokod bekor (route inline mantig'i)
        const p = await tx.promoCode.findUnique({
          where: { code: PROMO },
          select: { id: true, usedCount: true },
        });
        if (p) {
          await tx.promoCode.update({
            where: { id: p.id },
            data: { usedCount: { decrement: p.usedCount > 0 ? 1 : 0 } },
          });
          await tx.userCoupon.updateMany({
            where: { userId: user.id, promoCodeId: p.id },
            data: { redeemedAt: null },
          });
        }
        const promoAfter = await tx.promoCode.findUnique({
          where: { code: PROMO },
          select: { usedCount: true },
        });
        const ucAfter = await tx.userCoupon.findFirst({
          where: { userId: user.id, promoCodeId: promo.id },
          select: { redeemedAt: true },
        });
        check('promokod usedCount 1→0', promoAfter?.usedCount === 0, `${promoAfter?.usedCount}`);
        check('UserCoupon redeemedAt bekor (null)', ucAfter?.redeemedAt === null);

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
    console.log('\n=== RETURN REVERSAL SMOKE — jonli DB, rollback bilan ===');
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
