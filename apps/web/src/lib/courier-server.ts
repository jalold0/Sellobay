// Kuryer yetkazishlari — biznes-servis (application qatlami).
// HTTP'ga bog'liq emas; route faqat auth/parse qilib shu yerga keladi.
//
// NEGA BU FAYL PAYDO BO'LDI:
// `Delivery`, `DeliveryEvent` va `Courier` jadvallari sxemada bor edi,
// lekin ularga HECH KIM yozmasdi — jonli koddagi yagona havola
// karantindagi `graveyard/api` da edi. Natijada kuryer ilovasi
// ko'rsatadigan ma'lumot umuman yo'q edi.

import { Prisma, type DeliveryStatus } from '@ecom/database';

import { prisma } from '@/lib/db';

export class CourierError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CourierError';
  }
}

/**
 * Holat o'tishlari — FAQAT oldinga.
 *
 * Kuryer holatni orqaga qaytara olmaydi: "yetkazildi" dan keyin
 * "yo'lda" ga qaytarish mijozning buyurtma tarixini buzardi. Xato
 * bo'lsa — `FAILED`, uni admin hal qiladi.
 */
const TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  ASSIGNED: ['PICKED_UP', 'FAILED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['ARRIVED', 'DELIVERED', 'FAILED'],
  ARRIVED: ['DELIVERED', 'FAILED'],
  // Yakuniy holatlar — bu yerdan chiqish yo'q.
  DELIVERED: [],
  FAILED: [],
  RETURNED: [],
};

/** Shu holatdan keyin mumkin bo'lgan holatlar. */
export function nextDeliveryStatuses(current: DeliveryStatus): DeliveryStatus[] {
  return TRANSITIONS[current] ?? [];
}

export function canTransition(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return nextDeliveryStatuses(from).includes(to);
}

/** Yetkazish tugaganmi (boshqa o'zgarmaydi). */
export function isTerminalDeliveryStatus(status: DeliveryStatus): boolean {
  return nextDeliveryStatuses(status).length === 0;
}

const deliverySelect = {
  id: true,
  status: true,
  method: true,
  destinationAddress: true,
  destinationLat: true,
  destinationLng: true,
  assignedAt: true,
  pickedUpAt: true,
  deliveredAt: true,
  failureReason: true,
  createdAt: true,
  courierId: true,
  order: {
    select: {
      id: true,
      number: true,
      grandTotal: true,
      placedAt: true,
      notes: true,
      shippingAddress: {
        select: { recipientName: true, phone: true },
      },
      items: { select: { id: true, quantity: true, nameSnapshot: true } },
    },
  },
} satisfies Prisma.DeliverySelect;

type DeliveryRow = Prisma.DeliveryGetPayload<{ select: typeof deliverySelect }>;

function serialize(d: DeliveryRow) {
  return {
    id: d.id,
    status: d.status,
    method: d.method,
    destinationAddress: d.destinationAddress,
    destinationLat: d.destinationLat === null ? null : Number(d.destinationLat),
    destinationLng: d.destinationLng === null ? null : Number(d.destinationLng),
    assignedAt: d.assignedAt?.toISOString() ?? null,
    pickedUpAt: d.pickedUpAt?.toISOString() ?? null,
    deliveredAt: d.deliveredAt?.toISOString() ?? null,
    failureReason: d.failureReason,
    createdAt: d.createdAt.toISOString(),
    /** Keyingi mumkin bo'lgan holatlar — klient tugmalarni shunga qarab chizadi. */
    nextStatuses: nextDeliveryStatuses(d.status),
    order: {
      id: d.order.id,
      number: d.order.number,
      grandTotal: d.order.grandTotal.toString(),
      placedAt: d.order.placedAt.toISOString(),
      notes: d.order.notes,
      recipientName: d.order.shippingAddress?.recipientName ?? null,
      recipientPhone: d.order.shippingAddress?.phone ?? null,
      itemCount: d.order.items.length,
      items: d.order.items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        nameSnapshot: i.nameSnapshot,
      })),
    },
  };
}

/** `COURIER` roli borligini tekshiradi. */
export function assertCourier(roles: string[]): void {
  if (!roles.includes('COURIER')) {
    throw new CourierError(403, 'NOT_A_COURIER', 'Bu bo`lim faqat kuryerlar uchun');
  }
}

/**
 * Kuryer profili. Yo'q bo'lsa YARATILADI.
 *
 * Admin `COURIER` rolini bersa-yu `Courier` qatorini unutsa, kuryer
 * ilovaga kirib hech narsa qila olmay qolardi. Rol — haqiqat manbai,
 * profil esa shunchaki unga ergashadigan yozuv.
 */
async function ensureCourierProfile(userId: string): Promise<string> {
  const existing = await prisma.courier.findUnique({
    where: { userId },
    select: { id: true, isActive: true },
  });
  if (existing) {
    if (!existing.isActive) {
      throw new CourierError(403, 'COURIER_INACTIVE', 'Kuryer hisobi faol emas');
    }
    return existing.id;
  }
  const created = await prisma.courier.create({ data: { userId }, select: { id: true } });
  return created.id;
}

/**
 * Kuryerning ro'yxati.
 *
 * `mine` — o'ziga biriktirilgan, hali tugamagan yetkazishlar.
 * `available` — kuryersiz turgan yetkazishlar (istalgan kuryer olishi mumkin).
 *
 * E'TIBOR: kuryersiz yozuv ham `ASSIGNED` holatida bo'ladi — sxemadagi
 * standart qiymat shu va enumda "yaratildi" degan alohida holat yo'q.
 * Shuning uchun "bo'sh"ligini `courierId === null` belgilaydi, holat emas.
 */
export async function listCourierDeliveries(userId: string) {
  const courier = await prisma.courier.findUnique({
    where: { userId },
    select: { id: true },
  });

  const [mine, available] = await Promise.all([
    courier
      ? prisma.delivery.findMany({
          where: { courierId: courier.id, status: { notIn: ['DELIVERED', 'FAILED', 'RETURNED'] } },
          orderBy: { createdAt: 'asc' },
          select: deliverySelect,
        })
      : Promise.resolve([]),
    prisma.delivery.findMany({
      where: { courierId: null, status: 'ASSIGNED' },
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: deliverySelect,
    }),
  ]);

  return { mine: mine.map(serialize), available: available.map(serialize) };
}

/**
 * Bo'sh yetkazishni o'ziga olish.
 *
 * Poyga holati: ikki kuryer bir vaqtda bossa, `updateMany` dagi
 * `courierId: null` sharti ikkinchisini to'xtatadi (0 qator yangilanadi)
 * — ya'ni bitta yetkazish ikki kishiga tushmaydi.
 */
export async function claimDelivery(userId: string, deliveryId: string) {
  const courierId = await ensureCourierProfile(userId);

  const result = await prisma.delivery.updateMany({
    where: { id: deliveryId, courierId: null, status: 'ASSIGNED' },
    data: { courierId, assignedAt: new Date() },
  });
  if (result.count === 0) {
    const exists = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { id: true },
    });
    if (!exists) throw new CourierError(404, 'NOT_FOUND', 'Yetkazish topilmadi');
    throw new CourierError(409, 'ALREADY_CLAIMED', 'Bu yetkazishni boshqa kuryer olgan');
  }

  await prisma.deliveryEvent.create({
    data: { deliveryId, status: 'ASSIGNED', note: 'Kuryer o`ziga oldi' },
  });

  const row = await prisma.delivery.findUniqueOrThrow({
    where: { id: deliveryId },
    select: deliverySelect,
  });
  return serialize(row);
}

/**
 * Holatni o'zgartirish.
 *
 * `DELIVERED` bo'lganda buyurtmaning o'zi ham yopiladi — aks holda
 * mijoz «Yo'lda» deb turgan buyurtmani qo'lida ushlab turardi.
 */
export async function updateDeliveryStatus(
  userId: string,
  deliveryId: string,
  next: DeliveryStatus,
  extra: { note?: string; latitude?: number; longitude?: number } = {},
) {
  const courier = await prisma.courier.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!courier) throw new CourierError(403, 'FORBIDDEN', 'Bu yetkazish sizga biriktirilmagan');

  const current = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    select: { id: true, status: true, courierId: true, orderId: true },
  });
  if (!current) throw new CourierError(404, 'NOT_FOUND', 'Yetkazish topilmadi');
  if (current.courierId !== courier.id) {
    throw new CourierError(403, 'FORBIDDEN', 'Bu yetkazish sizga biriktirilmagan');
  }
  if (!canTransition(current.status, next)) {
    throw new CourierError(
      409,
      'INVALID_TRANSITION',
      `«${current.status}» holatidan «${next}» ga o'tib bo'lmaydi`,
    );
  }
  if (next === 'FAILED' && !extra.note?.trim()) {
    throw new CourierError(400, 'REASON_REQUIRED', 'Sababni yozing');
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    // Shart bilan yangilash: parallel so'rov holatni allaqachon
    // o'zgartirgan bo'lsa, 0 qator tegadi va biz to'xtaymiz.
    const updated = await tx.delivery.updateMany({
      where: { id: deliveryId, status: current.status, courierId: courier.id },
      data: {
        status: next,
        ...(next === 'PICKED_UP' ? { pickedUpAt: now } : {}),
        ...(next === 'DELIVERED' ? { deliveredAt: now } : {}),
        ...(next === 'FAILED' ? { failureReason: extra.note?.trim() ?? null } : {}),
      },
    });
    if (updated.count === 0) {
      throw new CourierError(409, 'STATE_CHANGED', 'Holat allaqachon o`zgargan');
    }

    await tx.deliveryEvent.create({
      data: {
        deliveryId,
        status: next,
        note: extra.note?.trim() || null,
        latitude: extra.latitude != null ? new Prisma.Decimal(extra.latitude) : null,
        longitude: extra.longitude != null ? new Prisma.Decimal(extra.longitude) : null,
      },
    });

    if (next === 'DELIVERED') {
      // Bekor qilingan yoki allaqachon yopilgan buyurtmani qayta
      // ochmaymiz — shart bilan yangilaymiz.
      const closed = await tx.order.updateMany({
        where: {
          id: current.orderId,
          status: { notIn: ['CANCELLED', 'RETURNED', 'REFUNDED', 'DELIVERED'] },
        },
        data: { status: 'DELIVERED', deliveredAt: now },
      });
      if (closed.count > 0) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: current.orderId,
            status: 'DELIVERED',
            comment: 'Kuryer yetkazdi',
          },
        });
      }
    }
  });

  const row = await prisma.delivery.findUniqueOrThrow({
    where: { id: deliveryId },
    select: deliverySelect,
  });
  return serialize(row);
}
