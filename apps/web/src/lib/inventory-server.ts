// Sellobay — Ombor/inventar server logikasi (faqat API route'lardan import qilinadi).
// Loyalty-server.ts pattern'iga mos: $transaction ichida atomik yozuvlar.
//
// Model (admin/seller API'lari ham shunday hisoblaydi):
//   • InventoryItem VARYANT (ProductVariant) bo'yicha kalitlanadi.
//   • Mahsulot zaxirasi = uning varyantlari inventarining yig'indisi.
//   • MVP: bitta ombor (WH-TASHKENT-MAIN), locationId = null, mavjud zaxira = quantityOnHand.
//     (quantityReserved keyingi bosqichda — reserve/commit oqimi uchun.)
//
// Oversell himoyasi buyurtma yaratishda SHARTLI UPDATE bilan amalga oshiriladi:
//   UPDATE ... SET quantityOnHand = quantityOnHand - qty WHERE id = ? AND quantityOnHand >= qty
// Postgres qatorni lock qiladi — ikki parallel buyurtma oxirgi donани talashsa faqat biri o'tadi.

import type { Prisma } from '@ecom/database';

/** Zaxira yetmaganda tashlanadi. $transaction'ni rollback qiladi; route 409 qaytaradi. */
export class InsufficientStockError extends Error {
  constructor(
    public readonly productId: string,
    public readonly available: number,
    public readonly requested: number,
  ) {
    super('INSUFFICIENT_STOCK');
    this.name = 'InsufficientStockError';
  }
}

/** Buyurtma satri — chaqiruvchi (route) varyant + inventar qatorini oldindan aniqlab beradi. */
export interface StockLine {
  productId: string;
  variantId: string;
  inventoryItemId: string;
  warehouseId: string;
  quantity: number;
}

/**
 * Buyurtma yaratishda ($transaction ichida) zaxirani ATOMIK kamaytiradi.
 * Har bir satr uchun shartli UPDATE — zaxira yetmasa `count === 0` bo'ladi va
 * InsufficientStockError tashlanadi (tx to'liq rollback bo'ladi). Har biri uchun
 * DISPATCH turidagi StockMovement audit yozuvi yoziladi.
 *
 * Bir buyurtmada bir xil varyant bir necha marta kelsa ham to'g'ri ishlaydi:
 * har UPDATE joriy (kamaygan) qiymatni qayta o'qib gte'ni tekshiradi.
 */
export async function deductStockForOrder(
  tx: Prisma.TransactionClient,
  lines: StockLine[],
  orderNumber: string,
): Promise<void> {
  for (const line of lines) {
    const res = await tx.inventoryItem.updateMany({
      where: { id: line.inventoryItemId, quantityOnHand: { gte: line.quantity } },
      data: { quantityOnHand: { decrement: line.quantity } },
    });
    if (res.count === 0) {
      const inv = await tx.inventoryItem.findUnique({
        where: { id: line.inventoryItemId },
        select: { quantityOnHand: true },
      });
      throw new InsufficientStockError(line.productId, inv?.quantityOnHand ?? 0, line.quantity);
    }
    await tx.stockMovement.create({
      data: {
        warehouseId: line.warehouseId,
        variantId: line.variantId,
        type: 'DISPATCH',
        quantity: line.quantity,
        reference: orderNumber,
        reason: 'ORDER_PLACED',
      },
    });
  }
}

/**
 * Bekor qilish / qaytarishda zaxirani QAYTARADI (increment) + RETURN StockMovement.
 * OrderItem.variantId (yaratishda saqlangan) ishlatiladi; bo'lmasa (eski buyurtma yoki
 * inventar sozlanmagan mahsulot) — mahsulotning default varyanti topiladi.
 * Bir $transaction ichida chaqirilishi shart (holat o'zgarishi bilan atomik).
 *
 * Ikki marta ishga tushmaydi: cancel faqat PENDING, return faqat DELIVERED holatda
 * ruxsat etiladi va holat darhol o'zgaradi — status guard double-restock'dan saqlaydi.
 */
export async function restockOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  orderNumber: string,
  reason: string,
): Promise<{ restocked: number; skipped: string[] }> {
  // Faqat AVVAL zaxira kamaytirilgan buyurtmalarni qaytaramiz. Yangi buyurtma
  // yaratilganda barcha satrlar uchun DISPATCH yoziladi (yo'qsa tx rollback bo'lgan,
  // buyurtma umuman yaratilmagan). Bu tekshiruv yangi kod'dan oldingi (legacy)
  // buyurtmalar bekor/qaytarilganda zaxirani noto'g'ri oshirib yuborishdan saqlaydi.
  const dispatched = await tx.stockMovement.count({
    where: { reference: orderNumber, type: 'DISPATCH' },
  });
  if (dispatched === 0) return { restocked: 0, skipped: [] };

  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, variantId: true, quantity: true },
  });

  let restocked = 0;
  const skipped: string[] = []; // zaxira qaytarilmagan mahsulotlar (inventar topilmadi)
  for (const it of items) {
    let variantId = it.variantId;
    if (!variantId) {
      const variant = await tx.productVariant.findFirst({
        where: { productId: it.productId },
        orderBy: { position: 'asc' },
        select: { id: true },
      });
      variantId = variant?.id ?? null;
    }
    if (!variantId) {
      skipped.push(it.productId);
      continue; // inventar sozlanmagan — qaytaradigan qator yo'q
    }

    const inv = await tx.inventoryItem.findFirst({
      where: { variantId },
      select: { id: true, warehouseId: true },
    });
    if (!inv) {
      skipped.push(it.productId);
      continue;
    }

    await tx.inventoryItem.update({
      where: { id: inv.id },
      data: { quantityOnHand: { increment: it.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        warehouseId: inv.warehouseId,
        variantId,
        type: 'RETURN',
        quantity: it.quantity,
        reference: orderNumber,
        reason,
      },
    });
    restocked += it.quantity;
  }
  // Zaxira DISPATCH bilan kamaytirilgan-u, qaytarishda inventar topilmasa — bu ma'lumot
  // yaxlitligi anomaliyasi (mijoz qaytardi, lekin ombor kreditlanmadi). Jimgina o'tkazmaymiz.
  if (skipped.length > 0) {
    console.error(
      `[restockOrder] ${orderNumber}: ${skipped.length} qator uchun inventar topilmadi, zaxira qaytarilmadi`,
      { orderId, productIds: skipped, reason },
    );
  }
  return { restocked, skipped };
}
