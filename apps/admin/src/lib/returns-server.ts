// Qaytarilgan buyurtma uchun kuryer topshiriqlarini ochish.
//
// NEGA ADMIN ILOVASIDA: topshiriqni admin ochadi, kuryer emas.
// `apps/web` dagi `courier-server.ts` kuryerning O'Z amallari (ro'yxat,
// olish, holat) — u yerga admin huquqini tekshiradigan kod qo'ysak,
// kuryer servisi o'ziga tegishli bo'lmagan ishni bajarardi.
//
// Ikkala ilova ham AYNI bazaga `@ecom/database` orqali yozadi, shuning
// uchun bu yerda ochilgan topshiriqni kuryer `apps/web` API'si orqali
// darhol ko'radi.
//
// OQIM: mijoz `POST /api/orders/[id]/return` orqali qaytarishni
// so'raydi (buyurtma `RETURNED` bo'ladi) -> admin ko'rib chiqadi ->
// shu yerdagi `createReturnDeliveries` bilan kuryerga topshiriq
// ochiladi. Avtomatik ochmaymiz: asossiz so'rov ham kuryerni yo'lga
// chiqarardi.

import { prisma } from '@/lib/db';

import type { Prisma } from '@ecom/database';

export class ReturnError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ReturnError';
  }
}

/**
 * Mijozning manzilini bitta satrga yig'adi — kuryer shu yerdan oladi.
 *
 * `Delivery.pickupAddress` matn sifatida SAQLANADI: manzil keyin
 * tahrirlansa yoki o'chirilsa ham, kuryer topshiriq ochilgandagi
 * manzilni ko'rishi kerak.
 */
function formatAddress(
  a: {
    region: string;
    city: string;
    district: string | null;
    street: string;
    building: string | null;
    apartment: string | null;
  } | null,
): string | null {
  if (!a) return null;
  return [a.region, a.city, a.district, a.street, a.building, a.apartment]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');
}

function formatWarehouse(w: {
  name: string;
  region: string | null;
  city: string;
  address: string;
}): string {
  return [w.name, w.region, w.city, w.address]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ');
}

/**
 * Qaytarish topshiriqlarini ochadi.
 *
 * Mahsulot EGASIGA qarab bo'linadi: sotuvchining mahsuloti o'sha
 * sotuvchining omboriga, qolgani o'zimizning omborga. Bitta buyurtmada
 * ikkalasi aralash bo'lsa, ikkita ALOHIDA topshiriq ochiladi — kuryer
 * ikki manzilga boradi va har birida faqat o'sha yerga tegishli
 * mahsulotni ko'radi.
 *
 * Sotuvchining faol ombori bo'lmasa — o'zimizning omborga. Bu zaxira
 * ataylab: hozir sotuvchilarning birortasida ombor yo'q va zaxirasiz
 * qaytarish umuman ochilmasdi.
 *
 * IDEMPOTENT: topshiriq allaqachon ochilgan bo'lsa qaytarib beradi,
 * ikkinchi marta ochmaydi. Admin tugmani ikki marta bossa, kuryerda
 * ikkita bir xil topshiriq paydo bo'lardi.
 */
export async function createReturnDeliveries(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      status: true,
      shippingAddress: {
        select: {
          region: true,
          city: true,
          district: true,
          street: true,
          building: true,
          apartment: true,
          latitude: true,
          longitude: true,
        },
      },
      items: { select: { id: true, quantity: true, sellerId: true } },
      deliveries: { where: { kind: 'RETURN' }, select: { id: true } },
    },
  });
  if (!order) throw new ReturnError(404, 'NOT_FOUND', 'Buyurtma topilmadi');

  if (order.deliveries.length > 0) {
    return { created: 0, deliveryIds: order.deliveries.map((d) => d.id), alreadyExisted: true };
  }

  // Faqat qaytarilgan buyurtma. Holatni bu yerda tekshiramiz, chunki
  // topshiriq ochish qaytarishning DAVOMI: qaytarilmagan buyurtmaga
  // kuryer yuborish mijozdan mahsulotni sababsiz olib qo'yish bo'lardi.
  if (order.status !== 'RETURNED') {
    throw new ReturnError(
      409,
      'NOT_RETURNED',
      'Faqat qaytarilgan buyurtma uchun topshiriq ochiladi',
    );
  }
  if (order.items.length === 0) {
    throw new ReturnError(409, 'NO_ITEMS', 'Buyurtmada mahsulot yo`q');
  }

  const pickupAddress = formatAddress(order.shippingAddress);
  if (!pickupAddress) {
    // Punktda olingan buyurtmada yetkazish manzili yo'q — kuryer
    // qayerdan olishini bilmaydi.
    throw new ReturnError(
      409,
      'NO_PICKUP_ADDRESS',
      'Buyurtmada olib ketish manzili yo`q (punktda olingan bo`lishi mumkin)',
    );
  }

  const sellerIds = [
    ...new Set(order.items.map((i) => i.sellerId).filter((s): s is string => s !== null)),
  ];

  const warehouses = await prisma.warehouse.findMany({
    where: {
      isActive: true,
      OR: [{ sellerId: null }, ...(sellerIds.length > 0 ? [{ sellerId: { in: sellerIds } }] : [])],
    },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      region: true,
      sellerId: true,
      latitude: true,
      longitude: true,
    },
  });

  const bySeller = new Map(
    warehouses.filter((w) => w.sellerId !== null).map((w) => [w.sellerId!, w]),
  );
  const fallback = warehouses.find((w) => w.sellerId === null) ?? null;

  // Mahsulotlarni maqsad ombori bo'yicha guruhlaymiz.
  const groups = new Map<
    string,
    { warehouse: (typeof warehouses)[number]; items: typeof order.items }
  >();
  for (const item of order.items) {
    const target = (item.sellerId ? bySeller.get(item.sellerId) : null) ?? fallback;
    if (!target) {
      throw new ReturnError(
        409,
        'NO_WAREHOUSE',
        'Qaytarish uchun faol ombor topilmadi. Avval ombor qo`shing.',
      );
    }
    const group = groups.get(target.id);
    if (group) group.items.push(item);
    else groups.set(target.id, { warehouse: target, items: [item] });
  }

  const deliveryIds = await prisma.$transaction(async (tx) => {
    const ids: string[] = [];
    for (const { warehouse, items } of groups.values()) {
      const delivery = await tx.delivery.create({
        data: {
          orderId: order.id,
          kind: 'RETURN',
          status: 'ASSIGNED',
          // Yo'nalish teskari: OLIB KETISH mijozdan, YETKAZISH omborga.
          method: 'HOME_DELIVERY',
          pickupAddress,
          destinationAddress: formatWarehouse(warehouse),
          destinationLat: warehouse.latitude,
          destinationLng: warehouse.longitude,
          returnWarehouseId: warehouse.id,
          items: {
            create: items.map((i) => ({ orderItemId: i.id, quantity: i.quantity })),
          },
          events: { create: { status: 'ASSIGNED', note: 'Qaytarish topshirig`i ochildi' } },
        },
        select: { id: true },
      });
      ids.push(delivery.id);
    }
    return ids;
  });

  return { created: deliveryIds.length, deliveryIds, alreadyExisted: false };
}

/** Topshirig'i hali ochilmagan, qaytarilgan buyurtmalar — admin ro'yxati. */
export async function listPendingReturns(limit = 50) {
  const rows = await prisma.order.findMany({
    where: { status: 'RETURNED', deliveries: { none: { kind: 'RETURN' } } },
    orderBy: { updatedAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100),
    select: {
      id: true,
      number: true,
      grandTotal: true,
      updatedAt: true,
      items: { select: { id: true, quantity: true, nameSnapshot: true } },
      shippingAddress: { select: { recipientName: true, phone: true } },
    },
  });

  return rows.map((o) => ({
    id: o.id,
    number: o.number,
    grandTotal: o.grandTotal.toString(),
    returnedAt: o.updatedAt.toISOString(),
    itemCount: o.items.length,
    items: o.items.map((i) => ({
      id: i.id,
      quantity: i.quantity,
      nameSnapshot: i.nameSnapshot as Prisma.JsonValue,
    })),
    recipientName: o.shippingAddress?.recipientName ?? null,
    recipientPhone: o.shippingAddress?.phone ?? null,
  }));
}
