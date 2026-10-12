// Sellobay — ombor/inventar: $transaction ichida atomik yozuvlar (web, admin va NestJS uchun umumiy).
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

interface RestockLine {
  productId: string;
  variantId: string | null;
  quantity: number;
}

/**
 * Satrlar zaxirasini qaytaradi (increment) + har biriga RETURN StockMovement (`reference` bilan).
 * Idempotentlik va "avval kamaytirilganmi" tekshiruvi — chaqiruvchida.
 * `preferWarehouseId` — qaytarish topshirig'idagi ombor: varyantning u yerda inventari bo'lsa
 * o'sha qatorga, bo'lmasa varyantning istalgan inventariga.
 */
async function restockLines(
  tx: Prisma.TransactionClient,
  lines: RestockLine[],
  ctx: {
    reference: string;
    reason: string;
    orderNumber: string;
    preferWarehouseId?: string | null;
  },
): Promise<{ restocked: number; skipped: string[] }> {
  let restocked = 0;
  const skipped: string[] = []; // zaxira qaytarilmagan mahsulotlar (inventar topilmadi)
  for (const it of lines) {
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

    const inv =
      (ctx.preferWarehouseId
        ? await tx.inventoryItem.findFirst({
            where: { variantId, warehouseId: ctx.preferWarehouseId },
            select: { id: true, warehouseId: true },
          })
        : null) ??
      (await tx.inventoryItem.findFirst({
        where: { variantId },
        select: { id: true, warehouseId: true },
      }));
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
        reference: ctx.reference,
        reason: ctx.reason,
      },
    });
    restocked += it.quantity;
  }
  // Zaxira DISPATCH bilan kamaytirilgan-u, qaytarishda inventar topilmasa — bu ma'lumot
  // yaxlitligi anomaliyasi (mijoz qaytardi, lekin ombor kreditlanmadi). Jimgina o'tkazmaymiz.
  if (skipped.length > 0) {
    console.error(
      `[restock] ${ctx.orderNumber}: ${skipped.length} qator uchun inventar topilmadi, zaxira qaytarilmadi`,
      { reference: ctx.reference, productIds: skipped, reason: ctx.reason },
    );
  }
  return { restocked, skipped };
}

/** Shu buyurtma bo'yicha zaxira umuman kamaytirilganmi (legacy buyurtmalarda DISPATCH yo'q). */
async function wasDispatched(tx: Prisma.TransactionClient, orderNumber: string) {
  const n = await tx.stockMovement.count({ where: { reference: orderNumber, type: 'DISPATCH' } });
  return n > 0;
}

/**
 * Bekor qilishda (tovar hali omborda) butun buyurtma zaxirasini QAYTARADI + RETURN StockMovement.
 * OrderItem.variantId (yaratishda saqlangan) ishlatiladi; bo'lmasa (eski buyurtma yoki
 * inventar sozlanmagan mahsulot) — mahsulotning default varyanti topiladi.
 * Bir $transaction ichida chaqirilishi shart (holat o'zgarishi bilan atomik).
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
  if (!(await wasDispatched(tx, orderNumber))) return { restocked: 0, skipped: [] };

  // Idempotent: shu buyurtma bo'yicha zaxira allaqachon qaytarilgan bo'lsa (to'liq yoki qaytarish
  // topshirig'i orqali qisman) — qayta qaytarmaymiz. Bekor qilish bir necha yo'ldan kelishi
  // mumkin (mijoz, Payme, muddat o'tishi, admin) va ikkinchi chaqiruv omborni ikki barobar
  // oshirib yubormasligi kerak.
  const alreadyReturned = await tx.stockMovement.count({
    where: {
      type: 'RETURN',
      OR: [{ reference: orderNumber }, { reference: { startsWith: `${orderNumber}#` } }],
    },
  });
  if (alreadyReturned > 0) return { restocked: 0, skipped: [] };

  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, variantId: true, quantity: true },
  });
  return restockLines(tx, items, { reference: orderNumber, reason, orderNumber });
}

/**
 * Qaytarilgan tovar OMBORGA KELGANDA (qaytarish topshirig'i DELIVERED) — faqat shu topshiriqdagi
 * satrlar zaxirasini qaytaradi.
 *
 * Ilgari zaxira mijoz «qaytaraman» deb bosgan ondayoq qaytarilardi — tovar hali mijozda
 * bo'lsa ham boshqa xaridorga sotilishi mumkin edi (audit Y6).
 *
 * Idempotent: `reference = <buyurtma>#<topshiriq>`. Eski kod bilan zaxira so'rov paytida allaqachon
 * qaytarilgan (`reference = <buyurtma>`) buyurtmada qayta qaytarilmaydi.
 */
export async function restockReturnDelivery(
  tx: Prisma.TransactionClient,
  deliveryId: string,
  reason: string,
): Promise<{ restocked: number; skipped: string[] }> {
  const d = await tx.delivery.findUniqueOrThrow({
    where: { id: deliveryId },
    select: {
      kind: true,
      returnWarehouseId: true,
      order: { select: { number: true } },
      items: {
        select: { quantity: true, orderItem: { select: { productId: true, variantId: true } } },
      },
    },
  });
  if (d.kind !== 'RETURN') return { restocked: 0, skipped: [] };
  const orderNumber = d.order.number;
  if (!(await wasDispatched(tx, orderNumber))) return { restocked: 0, skipped: [] };

  const reference = `${orderNumber}#${deliveryId}`;
  const done = await tx.stockMovement.count({
    where: { type: 'RETURN', reference: { in: [orderNumber, reference] } },
  });
  if (done > 0) return { restocked: 0, skipped: [] };

  return restockLines(
    tx,
    d.items.map((i) => ({
      productId: i.orderItem.productId,
      variantId: i.orderItem.variantId,
      quantity: i.quantity,
    })),
    { reference, reason, orderNumber, preferWarehouseId: d.returnWarehouseId },
  );
}
