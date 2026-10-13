// 3PL — oxirgi masofa bitta logistika kompaniyasi orqali (ADR 0015).
//
// Kod provayderdan mustaqil: `ShippingProvider` jo'natmani provayderda ro'yxatdan o'tkazadi,
// holatlar esa `applyCarrierEvent` orqali (hozir admin tugmasi, keyin provayder webhook'i)
// bitta qoidalar jadvalidan (@ecom/core-domain `CARRIER_EVENT_RULES`) o'tadi.
//
// Shartnoma va API hujjati kelguncha — «qo'lda» provayder: admin kompaniya nomi va trek
// raqamini kiritadi. Fargo/BTS API'lari ochiq e'lon qilinmagan.

import { CARRIER_EVENT_RULES, type CarrierEvent } from '@ecom/core-domain';

import { applyFulfillmentTransition } from './fulfillment';
import { reverseOrderLoyalty } from './loyalty';
import { releaseOrderPromo } from './release';

import type { DeliveryStatus, Prisma } from '@ecom/database';

export interface CarrierRegistration {
  externalId: string | null;
  trackingNumber: string;
  labelUrl: string | null;
}

export interface ShippingProvider {
  /** `Delivery.carrier` ga yoziladigan kod. */
  readonly code: string;
  /** Jo'natmani provayderda ro'yxatdan o'tkazadi (tarmoq chaqiruvi — tranzaksiyadan TASHQARIDA). */
  register(input: { orderId: string; trackingNumber: string }): Promise<CarrierRegistration>;
}

/** «Qo'lda» provayder — trek raqamini admin kiritadi, provayderga hech narsa yuborilmaydi. */
export const manualShippingProvider: ShippingProvider = {
  code: 'MANUAL',
  async register({ trackingNumber }) {
    return { externalId: null, trackingNumber: trackingNumber.trim(), labelUrl: null };
  },
};

const PROVIDERS: Record<string, ShippingProvider> = {
  [manualShippingProvider.code]: manualShippingProvider,
};

export function getShippingProvider(code: string): ShippingProvider | null {
  return PROVIDERS[code] ?? null;
}

export class CarrierStateError extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'INVALID_TRANSITION' | 'COURIER_ASSIGNED',
    message: string,
  ) {
    super(message);
    this.name = 'CarrierStateError';
  }
}

async function outbound(tx: Prisma.TransactionClient, orderId: string) {
  const d = await tx.delivery.findFirst({
    where: { orderId, kind: 'OUTBOUND' },
    orderBy: { createdAt: 'desc' },
    select: { id: true, courierId: true, carrier: true },
  });
  if (!d) throw new CarrierStateError('NOT_FOUND', 'Yetkazish yozuvi topilmadi');
  return d;
}

async function loadOrder(tx: Prisma.TransactionClient, orderId: string) {
  const o = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      status: true,
      shippedAt: true,
      userId: true,
      promoCode: true,
    },
  });
  if (!o) throw new CarrierStateError('NOT_FOUND', 'Buyurtma topilmadi');
  return o;
}

async function setDelivery(
  tx: Prisma.TransactionClient,
  deliveryId: string,
  status: DeliveryStatus,
  event: CarrierEvent,
  now: Date,
  extra: Prisma.DeliveryUpdateInput = {},
  note?: string,
) {
  await tx.delivery.update({
    where: { id: deliveryId },
    data: {
      status,
      carrierStatus: event,
      carrierUpdatedAt: now,
      ...(status === 'PICKED_UP' ? { pickedUpAt: now } : {}),
      ...(status === 'DELIVERED' ? { deliveredAt: now } : {}),
      ...extra,
    },
  });
  await tx.deliveryEvent.create({ data: { deliveryId, status, note: note ?? event } });
}

/**
 * Buyurtma 3PL'ga topshirildi (hamma tovar omborda — PACKED). Buyurtma «Jo'natildi», yetkazish
 * yozuviga provayder, trek raqami yoziladi. O'z kuryerimiz olgan yetkazishni 3PL'ga berib
 * bo'lmaydi (bitta yetkazish — bitta egasi).
 */
export async function handOverToCarrier(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    provider: string;
    companyName: string;
    registration: CarrierRegistration;
    staffUserId: string | null;
  },
  now: Date = new Date(),
): Promise<void> {
  const order = await loadOrder(tx, input.orderId);
  if (!CARRIER_EVENT_RULES.HANDED_OVER.from.includes(order.status)) {
    throw new CarrierStateError(
      'INVALID_TRANSITION',
      'Buyurtma hali to‘liq yig‘ilmagan — avval «Qadoqlandi» bo‘lishi kerak',
    );
  }
  const d = await outbound(tx, order.id);
  if (d.courierId) {
    throw new CarrierStateError('COURIER_ASSIGNED', 'Bu buyurtmani o‘z kuryerimiz olgan');
  }
  await applyFulfillmentTransition(tx, order, 'SHIPPED', {
    changedBy: input.staffUserId,
    comment: `${input.companyName} ga topshirildi, trek ${input.registration.trackingNumber}`,
  });
  await setDelivery(tx, d.id, 'PICKED_UP', 'HANDED_OVER', now, {
    carrier: input.provider,
    externalId: input.registration.externalId,
    trackingNumber: input.registration.trackingNumber,
    labelUrl: input.registration.labelUrl,
    carrierPayload: { companyName: input.companyName },
  });
}

/**
 * 3PL hodisasi: yo'lda / yetkazildi / mijoz joyida rad etdi. Yetkazilganda to'lov, cashback,
 * sotuvchi daftari — oddiy «yetkazildi» bilan bir xil (`applyFulfillmentTransition`).
 * Rad etilganda: buyurtma «Qaytarildi», coin va promokod qaytariladi, naqd to'lov yopiladi;
 * tovar omborga qaytgach admin «Qaytarishlar»da qabul qiladi — zaxira shunda tiklanadi.
 */
export async function applyCarrierEvent(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    event: Exclude<CarrierEvent, 'HANDED_OVER'>;
    staffUserId: string | null;
    note?: string;
  },
  now: Date = new Date(),
): Promise<{ orderStatus: string }> {
  const rule = CARRIER_EVENT_RULES[input.event];
  const order = await loadOrder(tx, input.orderId);
  const d = await outbound(tx, order.id);
  if (!d.carrier) {
    throw new CarrierStateError('INVALID_TRANSITION', 'Buyurtma 3PL’ga topshirilmagan');
  }
  if (!rule.from.includes(order.status)) {
    throw new CarrierStateError(
      'INVALID_TRANSITION',
      `«${order.status}» holatidagi buyurtmaga bu hodisa mumkin emas`,
    );
  }

  if (input.event === 'REFUSED') {
    const reason = input.note?.trim() || 'sabab ko‘rsatilmagan';
    const moved = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: 'RETURNED' },
    });
    if (moved.count === 0) {
      throw new CarrierStateError('INVALID_TRANSITION', 'Buyurtma holati o‘zgargan');
    }
    await tx.orderStatusHistory.create({
      data: {
        orderId: order.id,
        status: 'RETURNED',
        changedBy: input.staffUserId,
        comment: `Mijoz topshirishda rad etdi: ${reason}`,
      },
    });
    // Naqd — pul olinmadi; oldindan to'langan bo'lsa «Pul qaytarish» navbatiga tushadi (RETURNED).
    await tx.payment.updateMany({
      where: { orderId: order.id, provider: 'CASH_ON_DELIVERY', status: 'PENDING' },
      data: { status: 'CANCELLED', failedAt: now },
    });
    if (order.userId) await reverseOrderLoyalty(tx, order.userId, order.number);
    await releaseOrderPromo(tx, { userId: order.userId, promoCode: order.promoCode });
    await setDelivery(tx, d.id, 'FAILED', 'REFUSED', now, { failureReason: reason }, reason);
    return { orderStatus: 'RETURNED' };
  }

  await applyFulfillmentTransition(tx, order, rule.order as 'OUT_FOR_DELIVERY' | 'DELIVERED', {
    changedBy: input.staffUserId,
    comment: input.event === 'DELIVERED' ? '3PL: yetkazildi' : '3PL: yetkazilmoqda',
  });
  await setDelivery(tx, d.id, rule.delivery, input.event, now);
  return { orderStatus: rule.order };
}
