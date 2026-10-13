// Sotuvchi jo'natmalari — buyurtmaning har bir sotuvchiga (va platformaga) tegishli qismi (ADR 0015).
//
// Oqim:
//   • to'lov tushganda (naqdda — buyurtma berilganda) har (sotuvchi, model) uchun jo'natma ochiladi;
//   • FBS: sotuvchi «qabul qildim» → «qadoqladim» → ombor «qabul qilindi» (HANDED_OVER);
//   • FBO / platformaning o'z tovari: ombor yig'ib «yig'ildi» (HANDED_OVER);
//   • hammasi HANDED_OVER bo'lgach buyurtma PACKED — bitta yetkazish bo'lib jo'naydi
//     (kuryer/3PL ro'yxatiga shundan keyin chiqadi — courier-server SHIPPABLE_ORDER).
//
// Global (Xitoy) buyurtmalarda jo'natma ochilmaydi — ularni operator olib boradi.

import {
  resolveMarketplaceSettings,
  shipmentDeadline,
  type FulfillmentModelKey,
  type MarketplaceSettings,
} from '@ecom/core-domain';

import type { Prisma, SellerShipmentStatus } from '@ecom/database';

export const MARKETPLACE_SETTING_ID = 'marketplace';

/** Hali omborga yetib kelmagan (konsolidatsiyani to'sib turgan) holatlar. */
export const OPEN_SHIPMENT_STATUSES: SellerShipmentStatus[] = ['NEW', 'ACCEPTED', 'PACKED'];

export class ShipmentStateError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID_TRANSITION' | 'FORBIDDEN',
    message: string,
  ) {
    super(message);
    this.name = 'ShipmentStateError';
  }
}

export async function loadMarketplaceSettings(
  tx: Prisma.TransactionClient,
): Promise<MarketplaceSettings> {
  const row = await tx.globalSetting.findUnique({
    where: { id: MARKETPLACE_SETTING_ID },
    select: { config: true },
  });
  return resolveMarketplaceSettings(row?.config ?? null);
}

/**
 * Buyurtma uchun jo'natmalarni ochadi. Idempotent: allaqachon ochilgan bo'lsa hech narsa
 * qilmaydi (bir nechta to'lov yo'li bir xil buyurtmaga ikki marta kelishi mumkin).
 */
export async function openSellerShipments(
  tx: Prisma.TransactionClient,
  orderId: string,
  now: Date = new Date(),
): Promise<number> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      globalFulfillment: { select: { id: true } },
      sellerShipments: { select: { id: true }, take: 1 },
      items: {
        select: { id: true, sellerId: true, product: { select: { fulfillmentModel: true } } },
      },
    },
  });
  if (!order || order.globalFulfillment || order.sellerShipments.length > 0) return 0;
  if (order.items.length === 0) return 0;

  const settings = await loadMarketplaceSettings(tx);
  // Platformaning o'z tovari (sotuvchisiz) — bizning omborda, ya'ni FBO.
  const groups = new Map<
    string,
    { sellerId: string | null; model: FulfillmentModelKey; itemIds: string[] }
  >();
  for (const it of order.items) {
    const model: FulfillmentModelKey = it.sellerId ? it.product.fulfillmentModel : 'FBO';
    const key = `${it.sellerId ?? 'platform'}:${model}`;
    const g = groups.get(key);
    if (g) g.itemIds.push(it.id);
    else groups.set(key, { sellerId: it.sellerId, model, itemIds: [it.id] });
  }

  for (const g of groups.values()) {
    const shipment = await tx.sellerShipment.create({
      data: {
        orderId,
        sellerId: g.sellerId,
        fulfillmentModel: g.model,
        deadlineAt: shipmentDeadline(g.model, settings, now),
      },
      select: { id: true },
    });
    await tx.orderItem.updateMany({
      where: { id: { in: g.itemIds } },
      data: { sellerShipmentId: shipment.id },
    });
  }
  return groups.size;
}

/** Bekor qilingan buyurtma — ochiq jo'natmalar yopiladi (sotuvchi qadoqlab yurmasin). */
export async function cancelSellerShipments(
  tx: Prisma.TransactionClient,
  orderId: string,
  now: Date = new Date(),
): Promise<number> {
  const res = await tx.sellerShipment.updateMany({
    where: { orderId, status: { in: OPEN_SHIPMENT_STATUSES } },
    data: { status: 'CANCELLED', cancelledAt: now },
  });
  return res.count;
}

const SELLER_TRANSITIONS: Record<
  'accept' | 'pack',
  { from: SellerShipmentStatus[]; to: SellerShipmentStatus }
> = {
  accept: { from: ['NEW'], to: 'ACCEPTED' },
  pack: { from: ['NEW', 'ACCEPTED'], to: 'PACKED' },
};

/** Sotuvchi (FBS) — «qabul qildim» / «qadoqladim». Faqat o'z jo'natmasi va faqat oldinga. */
export async function sellerAdvanceShipment(
  tx: Prisma.TransactionClient,
  input: { shipmentId: string; sellerId: string; action: 'accept' | 'pack' },
  now: Date = new Date(),
): Promise<SellerShipmentStatus> {
  const s = await tx.sellerShipment.findUnique({
    where: { id: input.shipmentId },
    select: { sellerId: true, fulfillmentModel: true, status: true },
  });
  if (!s || s.sellerId !== input.sellerId) {
    throw new ShipmentStateError('NOT_FOUND', 'Jo‘natma topilmadi');
  }
  if (s.fulfillmentModel !== 'FBS') {
    throw new ShipmentStateError('FORBIDDEN', 'FBO jo‘natmasini ombor yig‘adi');
  }
  const t = SELLER_TRANSITIONS[input.action];
  const moved = await tx.sellerShipment.updateMany({
    where: { id: input.shipmentId, status: { in: t.from } },
    data: {
      status: t.to,
      ...(t.to === 'ACCEPTED' ? { acceptedAt: now } : {}),
      ...(t.to === 'PACKED'
        ? { packedAt: now, acceptedAt: s.status === 'NEW' ? now : undefined }
        : {}),
    },
  });
  if (moved.count === 0) {
    throw new ShipmentStateError(
      'INVALID_TRANSITION',
      `«${s.status}» holatidan bu amal mumkin emas`,
    );
  }
  return t.to;
}

/**
 * Ombor — jo'natma qabul qilindi (FBS: sotuvchi tovarni olib keldi) yoki yig'ildi (FBO).
 * FBS'da sotuvchi panelda «qadoqladim» demagan bo'lsa ham, tovar qo'lda kelgan bo'lsa qabul
 * qilinadi — jismoniy qabul hal qiluvchi, aks holda buyurtma tugma bosilmagani uchun qotadi.
 * Hammasi kelgan bo'lsa buyurtma PACKED bo'ladi. `orderReady` — hamma jo'natma omborda;
 * `orderPacked` — buyurtma aynan shu chaqiruvda PACKED'ga o'tdi (mijozga xabar shundagina).
 */
export async function receiveSellerShipment(
  tx: Prisma.TransactionClient,
  input: { shipmentId: string; staffUserId: string },
  now: Date = new Date(),
): Promise<{ orderId: string; orderReady: boolean; orderPacked: boolean }> {
  const s = await tx.sellerShipment.findUnique({
    where: { id: input.shipmentId },
    select: { orderId: true, fulfillmentModel: true, status: true },
  });
  if (!s) throw new ShipmentStateError('NOT_FOUND', 'Jo‘natma topilmadi');
  const moved = await tx.sellerShipment.updateMany({
    where: { id: input.shipmentId, status: { in: OPEN_SHIPMENT_STATUSES } },
    data: { status: 'HANDED_OVER', handedOverAt: now, receivedById: input.staffUserId },
  });
  if (moved.count === 0) {
    throw new ShipmentStateError(
      'INVALID_TRANSITION',
      s.status === 'CANCELLED' ? 'Buyurtma bekor qilingan' : 'Jo‘natma allaqachon qabul qilingan',
    );
  }
  const c = await consolidateIfReady(tx, s.orderId, input.staffUserId);
  return { orderId: s.orderId, orderReady: c.ready, orderPacked: c.packed };
}

/**
 * Admin buyurtmani qo'lda PACKED yoki undan keyingi holatga o'tkazsa — omborning o'z (FBO)
 * jo'natmalari yig'ildi deb hisoblanadi. FBS jo'natmalari esa «Ombor qabuli»da qabul qilinadi.
 */
export async function completeWarehouseShipments(
  tx: Prisma.TransactionClient,
  orderId: string,
  staffUserId: string | null,
  now: Date = new Date(),
): Promise<number> {
  const res = await tx.sellerShipment.updateMany({
    where: { orderId, fulfillmentModel: 'FBO', status: { in: OPEN_SHIPMENT_STATUSES } },
    data: { status: 'HANDED_OVER', handedOverAt: now, receivedById: staffUserId },
  });
  return res.count;
}

/** Hali omborga kelmagan FBS jo'natmalari soni (buyurtmani jo'natishni to'sadi). */
export async function openSellerShipmentCount(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<number> {
  return tx.sellerShipment.count({
    where: { orderId, status: { in: OPEN_SHIPMENT_STATUSES } },
  });
}

/** Hamma jo'natma omborda bo'lsa buyurtma PACKED (bir marta, atomik). */
export async function consolidateIfReady(
  tx: Prisma.TransactionClient,
  orderId: string,
  staffUserId: string | null,
): Promise<{ ready: boolean; packed: boolean }> {
  if ((await openSellerShipmentCount(tx, orderId)) > 0) return { ready: false, packed: false };
  const moved = await tx.order.updateMany({
    where: { id: orderId, status: { in: ['PENDING', 'CONFIRMED', 'PAID', 'PROCESSING'] } },
    data: { status: 'PACKED' },
  });
  if (moved.count > 0) {
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        status: 'PACKED',
        changedBy: staffUserId,
        comment: 'Barcha tovarlar omborda — yetkazishga tayyor',
      },
    });
  }
  return { ready: true, packed: moved.count > 0 };
}
