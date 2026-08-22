// Global buyurtma ("zayavka") operator servisi.
//
// Oqim: mijoz to'ladi → NEW → operator jonli narxni tekshiradi (PRICE_CHECK) →
//   chetlanish qarori (@ecom/core-domain/global-variance):
//     AUTO_CONFIRM     → CONFIRMED (kichik farqni o'zimiz yutamiz)
//     ASK_CUSTOMER     → PRICE_CHANGED (mijozdan qo'shimcha so'raladi)
//     CANCEL_SUGGESTED → PRICE_CHANGED, lekin bekor tavsiya etiladi
//   → operator platformadan sotib oladi (PURCHASED) → trek raqam kargo saytiga (IN_CARGO)
//   → mijoz oldi (DELIVERED).

import { evaluateVariance } from '@ecom/core-domain';
import { Prisma } from '@ecom/database';
import { z } from 'zod';

import { prisma } from '@/lib/db';
import { computeGlobalPrice } from '@/lib/global-catalog-server';
import { notifyGlobalCustomer } from '@/lib/global-notify';
import { getGlobalSettings } from '@/lib/global-settings-server';

export class GlobalFulfillmentError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'GlobalFulfillmentError';
  }
}

type Operator = { id: string; roles?: string[] } | null;

const OPERATOR_ROLES = ['ADMIN', 'SUPER_ADMIN'];

function assertOperator(user: Operator): asserts user is { id: string; roles: string[] } {
  if (!user) throw new GlobalFulfillmentError(401, 'UNAUTHENTICATED', 'Tizimga kirilmagan');
  if (!user.roles?.some((r) => OPERATOR_ROLES.includes(r))) {
    throw new GlobalFulfillmentError(403, 'FORBIDDEN', "Ruxsat yo'q (faqat admin)");
  }
}

export const verifyPriceSchema = z.object({
  /** Operator Xitoyda hozir ko'rgan narx (¥). Berilmasa katalogdagi narx olinadi. */
  priceCny: z.number().positive().max(1_000_000).optional(),
  note: z.string().max(1000).optional(),
});

export const purchaseSchema = z.object({
  /** Platformadagi zakaz raqami. */
  purchaseRef: z.string().min(1).max(200),
  note: z.string().max(1000).optional(),
});

export const trackSchema = z.object({
  trackNumber: z.string().min(3).max(120),
  /** Kargo tortgan haqiqiy og'irlik (kg) — bo'lsa katalogdagi taxmin ham yangilanadi. */
  actualWeightKg: z.number().positive().max(500).optional(),
  note: z.string().max(1000).optional(),
});

export const statusSchema = z.object({
  status: z.enum(['CONFIRMED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  note: z.string().max(1000).optional(),
});

function dec(v: Prisma.Decimal | null): number | null {
  return v === null ? null : Number(v);
}

type Row = NonNullable<Awaited<ReturnType<typeof loadFulfillment>>>;

async function loadFulfillment(id: string) {
  return prisma.globalFulfillment.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          id: true,
          number: true,
          userId: true,
          status: true,
          grandTotal: true,
          placedAt: true,
          user: { select: { firstName: true, lastName: true, phone: true } },
          shippingAddress: {
            select: { recipientName: true, phone: true, region: true, city: true, street: true },
          },
          items: {
            select: {
              quantity: true,
              unitPrice: true,
              totalPrice: true,
              nameSnapshot: true,
              product: {
                select: {
                  id: true,
                  sku: true,
                  globalSource: {
                    select: {
                      id: true,
                      normalizedUrl: true,
                      platform: true,
                      priceCny: true,
                      weightCategory: true,
                      manualWeightKg: true,
                      actualWeightKg: true,
                      chinaDomesticCny: true,
                      lengthCm: true,
                      widthCm: true,
                      heightCm: true,
                      defaultFreightMode: true,
                      marginPct: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

/** Faqat global pozitsiyalar (oddiy tovarlar zayavkaga kirmaydi). */
function globalItems(row: Row) {
  return row.order.items.filter((i) => i.product.globalSource !== null);
}

function toView(row: Row) {
  const items = globalItems(row);
  return {
    id: row.id,
    status: row.status,
    freightMode: row.freightMode,
    paidTotal: Number(row.paidTotal),
    verifiedPriceCny: dec(row.verifiedPriceCny),
    verifiedTotal: dec(row.verifiedTotal),
    varianceDecision: row.varianceDecision,
    absorbedTotal: dec(row.absorbedTotal),
    extraChargeTotal: dec(row.extraChargeTotal),
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    purchaseRef: row.purchaseRef,
    trackNumber: row.trackNumber,
    actualWeightKg: dec(row.actualWeightKg),
    cargoRegisteredAt: row.cargoRegisteredAt?.toISOString() ?? null,
    purchasedAt: row.purchasedAt?.toISOString() ?? null,
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
    operatorNote: row.operatorNote,
    createdAt: row.createdAt.toISOString(),
    order: {
      id: row.order.id,
      number: row.order.number,
      status: row.order.status,
      grandTotal: Number(row.order.grandTotal),
      placedAt: row.order.placedAt.toISOString(),
      customer:
        [row.order.user?.firstName, row.order.user?.lastName].filter(Boolean).join(' ') || null,
      phone: row.order.shippingAddress?.phone ?? row.order.user?.phone ?? null,
      address: row.order.shippingAddress
        ? `${row.order.shippingAddress.region}, ${row.order.shippingAddress.city}, ${row.order.shippingAddress.street}`
        : null,
      recipient: row.order.shippingAddress?.recipientName ?? null,
    },
    items: items.map((i) => ({
      sku: i.product.sku,
      name: (i.nameSnapshot as { uz?: string })?.uz ?? i.product.sku,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
      sourceUrl: i.product.globalSource?.normalizedUrl ?? null,
      platform: i.product.globalSource?.platform ?? null,
      priceCny: i.product.globalSource ? Number(i.product.globalSource.priceCny) : null,
    })),
  };
}

export type GlobalFulfillmentView = ReturnType<typeof toView>;

// ===================================================================

export async function listFulfillments(user: Operator, status?: string, take = 100) {
  assertOperator(user);

  const rows = await prisma.globalFulfillment.findMany({
    where: status ? { status: status as never } : {},
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    take: Math.min(take, 200),
    select: { id: true },
  });

  const full = await Promise.all(rows.map((r) => loadFulfillment(r.id)));
  return { items: full.filter((r): r is Row => r !== null).map(toView) };
}

export async function getFulfillment(id: string, user: Operator) {
  assertOperator(user);
  const row = await loadFulfillment(id);
  if (!row) throw new GlobalFulfillmentError(404, 'NOT_FOUND', 'Zayavka topilmadi');
  return toView(row);
}

/**
 * Operator Xitoydagi HOZIRGI narxni kiritadi → biz qayta hisoblab, mijoz to'lagani
 * bilan solishtiramiz va chetlanish qaroriga ko'ra statusni belgilaymiz.
 */
export async function verifyFulfillmentPrice(
  id: string,
  input: z.infer<typeof verifyPriceSchema>,
  user: Operator,
) {
  assertOperator(user);

  const row = await loadFulfillment(id);
  if (!row) throw new GlobalFulfillmentError(404, 'NOT_FOUND', 'Zayavka topilmadi');
  if (row.status !== 'NEW' && row.status !== 'PRICE_CHECK' && row.status !== 'PRICE_CHANGED') {
    throw new GlobalFulfillmentError(409, 'INVALID_STATE', 'Bu zayavka allaqachon tasdiqlangan');
  }

  const items = globalItems(row);
  if (items.length === 0) {
    throw new GlobalFulfillmentError(422, 'NO_GLOBAL_ITEMS', 'Buyurtmada global tovar yo‘q');
  }

  // Har bir global pozitsiyani hozirgi ma'lumot bilan qayta narxlaymiz.
  // Tariflar/kurs/chegaralar bazadagi sozlamalardan (admin panelidan boshqariladi).
  const settings = await getGlobalSettings();
  let actualTotal = 0;
  for (const item of items) {
    const gs = item.product.globalSource!;
    const priceCny = input.priceCny ?? Number(gs.priceCny);
    const dims =
      gs.lengthCm && gs.widthCm && gs.heightCm
        ? { l: Number(gs.lengthCm), w: Number(gs.widthCm), h: Number(gs.heightCm) }
        : undefined;

    const priced = computeGlobalPrice(
      {
        priceCny,
        chinaDomesticCny: gs.chinaDomesticCny === null ? undefined : Number(gs.chinaDomesticCny),
        weightCategory: gs.weightCategory,
        manualWeightKg: gs.manualWeightKg === null ? undefined : Number(gs.manualWeightKg),
        actualWeightKg: gs.actualWeightKg === null ? null : Number(gs.actualWeightKg),
        dimsCm: dims,
        freightMode: row.freightMode,
        marginPct: gs.marginPct === null ? undefined : Number(gs.marginPct),
      },
      settings,
    );
    actualTotal += priced.breakdown.totalUzs * item.quantity;
  }

  const paid = Number(row.paidTotal);
  const variance = evaluateVariance(paid, actualTotal, settings.variance);

  const nextStatus = variance.decision === 'AUTO_CONFIRM' ? 'CONFIRMED' : 'PRICE_CHANGED';

  const updated = await prisma.globalFulfillment.update({
    where: { id },
    data: {
      status: nextStatus,
      verifiedPriceCny:
        input.priceCny === undefined ? undefined : new Prisma.Decimal(input.priceCny),
      verifiedTotal: new Prisma.Decimal(actualTotal.toFixed(2)),
      varianceDecision: variance.decision,
      absorbedTotal: new Prisma.Decimal(variance.absorbedUzs.toFixed(2)),
      extraChargeTotal: new Prisma.Decimal(variance.extraChargeUzs.toFixed(2)),
      verifiedAt: new Date(),
      operatorId: user.id,
      ...(input.note ? { operatorNote: input.note } : {}),
    },
    select: { id: true },
  });

  await notifyGlobalCustomer(prisma, {
    userId: row.order.userId,
    orderNumber: row.order.number,
    event:
      nextStatus === 'CONFIRMED'
        ? { kind: 'CONFIRMED' }
        : { kind: 'PRICE_CHANGED', extraChargeUzs: variance.extraChargeUzs },
  });

  return {
    ...(await getFulfillment(updated.id, user)),
    variance: {
      decision: variance.decision,
      diffUzs: variance.diffUzs,
      diffPct: variance.diffPct,
      absorbedUzs: variance.absorbedUzs,
      extraChargeUzs: variance.extraChargeUzs,
    },
  };
}

/** Operator platformadan sotib oldi. */
export async function markPurchased(
  id: string,
  input: z.infer<typeof purchaseSchema>,
  user: Operator,
) {
  assertOperator(user);
  const row = await prisma.globalFulfillment.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!row) throw new GlobalFulfillmentError(404, 'NOT_FOUND', 'Zayavka topilmadi');
  if (row.status !== 'CONFIRMED') {
    throw new GlobalFulfillmentError(409, 'NOT_CONFIRMED', 'Avval narxni tekshirib tasdiqlang');
  }

  const updated = await prisma.globalFulfillment.update({
    where: { id },
    data: {
      status: 'PURCHASED',
      purchaseRef: input.purchaseRef.trim(),
      purchasedAt: new Date(),
      operatorId: user.id,
      ...(input.note ? { operatorNote: input.note } : {}),
    },
    select: { order: { select: { userId: true, number: true } } },
  });

  await notifyGlobalCustomer(prisma, {
    userId: updated.order.userId,
    orderNumber: updated.order.number,
    event: { kind: 'PURCHASED' },
  });
  return getFulfillment(id, user);
}

/**
 * Trek raqam olindi va kargo saytiga mijoz manzili bilan kiritildi.
 * O'lchov berilsa — katalogdagi taxmin ham o'lchov bilan almashadi (jadval aniqlashadi).
 */
export async function registerTracking(
  id: string,
  input: z.infer<typeof trackSchema>,
  user: Operator,
) {
  assertOperator(user);

  const row = await loadFulfillment(id);
  if (!row) throw new GlobalFulfillmentError(404, 'NOT_FOUND', 'Zayavka topilmadi');
  if (row.status !== 'PURCHASED' && row.status !== 'IN_CARGO') {
    throw new GlobalFulfillmentError(409, 'NOT_PURCHASED', 'Avval platformadan sotib oling');
  }

  await prisma.$transaction(async (tx) => {
    await tx.globalFulfillment.update({
      where: { id },
      data: {
        status: 'IN_CARGO',
        trackNumber: input.trackNumber.trim(),
        cargoRegisteredAt: new Date(),
        operatorId: user.id,
        ...(input.actualWeightKg !== undefined
          ? { actualWeightKg: new Prisma.Decimal(input.actualWeightKg) }
          : {}),
        ...(input.note ? { operatorNote: input.note } : {}),
      },
    });

    // O'lchangan og'irlik katalogga qaytadi — keyingi importlar aniqroq bo'ladi
    if (input.actualWeightKg !== undefined) {
      const sourceIds = globalItems(row)
        .map((i) => i.product.globalSource!.id)
        .filter((v, idx, arr) => arr.indexOf(v) === idx);
      if (sourceIds.length === 1) {
        await tx.globalSource.update({
          where: { id: sourceIds[0] },
          data: {
            actualWeightKg: new Prisma.Decimal(input.actualWeightKg),
            weightSamples: { increment: 1 },
          },
        });
      }
    }
  });

  await notifyGlobalCustomer(prisma, {
    userId: row.order.userId,
    orderNumber: row.order.number,
    event: { kind: 'IN_CARGO', trackNumber: input.trackNumber.trim() },
  });

  return getFulfillment(id, user);
}

/** Qo'lda status o'zgartirish (tasdiqlash, yetkazildi, bekor, pul qaytarildi). */
export async function setFulfillmentStatus(
  id: string,
  input: z.infer<typeof statusSchema>,
  user: Operator,
) {
  assertOperator(user);
  const row = await prisma.globalFulfillment.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!row) throw new GlobalFulfillmentError(404, 'NOT_FOUND', 'Zayavka topilmadi');

  if (input.status === 'CONFIRMED' && row.status === 'PURCHASED') {
    throw new GlobalFulfillmentError(
      409,
      'INVALID_STATE',
      'Sotib olingan zayavkani qaytarib bo‘lmaydi',
    );
  }

  const updated = await prisma.globalFulfillment.update({
    where: { id },
    data: {
      status: input.status,
      operatorId: user.id,
      ...(input.status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
      ...(input.note ? { operatorNote: input.note } : {}),
    },
    select: { order: { select: { userId: true, number: true } } },
  });

  if (input.status === 'DELIVERED' || input.status === 'CANCELLED' || input.status === 'REFUNDED') {
    await notifyGlobalCustomer(prisma, {
      userId: updated.order.userId,
      orderNumber: updated.order.number,
      event: input.status === 'DELIVERED' ? { kind: 'DELIVERED' } : { kind: 'CANCELLED' },
    });
  }
  return getFulfillment(id, user);
}
