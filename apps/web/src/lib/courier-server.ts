// Kuryer yetkazishlari — biznes-servis (application qatlami).
// HTTP'ga bog'liq emas; route faqat auth/parse qilib shu yerga keladi.
//
// NEGA BU FAYL PAYDO BO'LDI:
// `Delivery`, `DeliveryEvent` va `Courier` jadvallari sxemada bor edi,
// lekin ularga HECH KIM yozmasdi — jonli koddagi yagona havola
// karantindagi `graveyard/api` da edi. Natijada kuryer ilovasi
// ko'rsatadigan ma'lumot umuman yo'q edi.

import { Prisma, type DeliveryStatus, type OrderStatus } from '@ecom/database';

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

/**
 * Yetkazish holati -> BUYURTMA holati.
 *
 * NEGA KERAK: ilgari buyurtma holatiga faqat `DELIVERED` da tegilardi
 * va `OrderStatusHistory` ga butun kodda shu yagona joy yozardi.
 * Natijada mijoz kuzatuvida buyurtma «Kutilmoqda» dan to'g'ridan-to'g'ri
 * «Yetkazildi» ga sakrardi: kuryer olgani ham, yo'lga chiqqani ham
 * ko'rinmasdi, garchi `DeliveryEvent` da hammasi yozilgan bo'lsa ham.
 *
 * `FAILED` ataylab YO'Q: urinish muvaffaqiyatsiz bo'lgani buyurtmani
 * bekor qilmaydi — ertaga qayta urinish mumkin. Qarorni admin qabul
 * qiladi.
 */
const ORDER_STATUS_FOR: Partial<Record<DeliveryStatus, OrderStatus>> = {
  PICKED_UP: 'SHIPPED',
  IN_TRANSIT: 'OUT_FOR_DELIVERY',
  // `ARRIVED` ham `OUT_FOR_DELIVERY`: mijoz uchun «kuryer yo'lda» va
  // «kuryer eshik oldida» bitta holat. Buyurtma enumida alohida
  // qiymat yo'q, qo'shish esa migratsiya talab qilardi.
  ARRIVED: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
};

/**
 * Yetkazish holatiga mos buyurtma holati (yoki `null` — tegilmaydi).
 *
 * Eksport qilingan: sof funksiya, testda bazasiz tekshiriladi.
 */
export function orderStatusFor(delivery: DeliveryStatus): OrderStatus | null {
  return ORDER_STATUS_FOR[delivery] ?? null;
}

/** Tarixdagi izoh — kuryer qaysi qadamni bosgani ko'rinib tursin. */
const ORDER_COMMENT: Partial<Record<DeliveryStatus, string>> = {
  PICKED_UP: 'Kuryer buyurtmani oldi',
  IN_TRANSIT: "Kuryer yo'lga chiqdi",
  ARRIVED: 'Kuryer manzilga yetib keldi',
  DELIVERED: 'Kuryer yetkazdi',
};

/** Yopilgan buyurtma QAYTA OCHILMAYDI. */
const CLOSED_ORDER_STATUSES: OrderStatus[] = ['CANCELLED', 'RETURNED', 'REFUNDED', 'DELIVERED'];

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
  proofPhotoUrl: true,
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

export type DeliveryRow = Prisma.DeliveryGetPayload<{ select: typeof deliverySelect }>;

/**
 * Bazadagi qatorni klient javobiga o'giradi.
 *
 * Eksport qilingan — sof funksiya va testda bazasiz tekshiriladi.
 */
export function serializeDelivery(d: DeliveryRow) {
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
    /**
     * Isbot surati biriktirilganmi.
     *
     * Yo'lning O'ZI qaytmaydi: suratda mijozning uyi, eshigi, ba'zan
     * o'zi ham bo'ladi. Kuryerga «biriktirdim»ni bilish yetarli,
     * suratni ko'rish kerak emas — uni admin ko'radi.
     */
    hasProofPhoto: d.proofPhotoUrl !== null,
    createdAt: d.createdAt.toISOString(),
    /**
     * Kuryer biriktirilganmi.
     *
     * `ASSIGNED` holati "yetkazishga tayinlandi" degani, "kuryerga
     * biriktirildi" EMAS — yangi yozuv egasiz holda ham `ASSIGNED`
     * bo'ladi. Shu farqni klient o'zi topa olmaydi, shuning uchun
     * server aytadi: aks holda ilova egasiz topshiriq ustida
     * "Biriktirildi" deb yozib turadi.
     */
    claimed: d.courierId !== null,
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

  return { mine: mine.map(serializeDelivery), available: available.map(serializeDelivery) };
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
  return serializeDelivery(row);
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
  extra: {
    note?: string;
    latitude?: number;
    longitude?: number;
    /** `/api/uploads/delivery-proof` qaytargan ichki yo'l. */
    proofPhotoUrl?: string;
  } = {},
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

  // Surat FAQAT yakuniy holatlarga biriktiriladi.
  //
  // `DELIVERED` — topshirilgani isboti. `FAILED` ham ataylab ruxsat
  // etilgan: «uyda hech kim yo'q» degan sababni yopiq eshik surati
  // tasdiqlaydi va bahsda shu hal qiladi.
  //
  // Oraliq holatga kelsa — bu klient xatosi. Jim e'tiborsiz qoldirsak,
  // kuryer suratni biriktirdim deb o'ylab, u esa hech qayerga
  // yozilmagan bo'lardi.
  const proof = extra.proofPhotoUrl?.trim();
  if (proof && next !== 'DELIVERED' && next !== 'FAILED') {
    throw new CourierError(
      400,
      'PROOF_NOT_ALLOWED',
      'Suratni faqat «yetkazildi» yoki «bajarilmadi» holatiga biriktirib bo`ladi',
    );
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
        ...(proof ? { proofPhotoUrl: proof } : {}),
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

    // Buyurtma holati yetkazish holatiga ERGASHADI.
    const orderNext = ORDER_STATUS_FOR[next];
    if (orderNext != null) {
      const changed = await tx.order.updateMany({
        where: {
          id: current.orderId,
          status: {
            notIn: CLOSED_ORDER_STATUSES,
            // O'sha holatning O'ZIGA qayta yozmaymiz: `IN_TRANSIT` ham,
            // `ARRIVED` ham `OUT_FOR_DELIVERY` ga olib keladi va
            // tarixda ikkita bir xil qator paydo bo'lardi.
            not: orderNext,
          },
        },
        data: {
          status: orderNext,
          ...(orderNext === 'SHIPPED' ? { shippedAt: now } : {}),
          ...(orderNext === 'DELIVERED' ? { deliveredAt: now } : {}),
        },
      });
      if (changed.count > 0) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: current.orderId,
            status: orderNext,
            comment: ORDER_COMMENT[next] ?? null,
          },
        });
      }
    }
  });

  const row = await prisma.delivery.findUniqueOrThrow({
    where: { id: deliveryId },
    select: deliverySelect,
  });
  return serializeDelivery(row);
}

/**
 * Toshkent kunining boshlanishi, UTC `Date` sifatida.
 *
 * `new Date().setHours(0,0,0,0)` SERVER zonasini oladi — Vercel'da u
 * UTC. Natijada ertalab soat 03:00 da (Toshkent) hali «kechagi» kun
 * davom etardi va kuryer bajargan ishini statistikada ko'rmasdi.
 *
 * O'zbekiston — UTC+5, yozgi vaqtga o'tish 2005 yildan beri yo'q,
 * shuning uchun qat'iy siljish to'g'ri (Intl bilan zona hisoblash bu
 * yerda ortiqcha murakkablik bo'lardi).
 */
const UZ_OFFSET_MS = 5 * 60 * 60 * 1000;

export function tashkentDayStart(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + UZ_OFFSET_MS);
  const midnightUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  );
  return new Date(midnightUtc - UZ_OFFSET_MS);
}

/**
 * Kuryerning statistikasi.
 *
 * Faqat HISOBLANADIGAN raqamlar: yetkazilgan va bajarilmagan topshiriq
 * soni. Daromad ko'rsatilmaydi — sxemada kuryer to'lovi modeli YO'Q
 * (`Courier` da na tarif, na balans bor), shuning uchun har qanday
 * summa to'qima bo'lardi.
 */
export async function courierStats(userId: string) {
  const courier = await prisma.courier.findUnique({
    where: { userId },
    select: { id: true },
  });
  // Profil hali yo'q — hech narsa qilmagan kuryer. Nol qaytaramiz,
  // 404 emas: ilova uchun bu xato emas, oddiy boshlang'ich holat.
  if (!courier) {
    return { today: { delivered: 0, failed: 0 }, active: 0, allTimeDelivered: 0 };
  }

  const dayStart = tashkentDayStart();
  const mine = { courierId: courier.id } as const;

  const [todayDelivered, todayFailed, active, allTimeDelivered] = await Promise.all([
    // `deliveredAt` bo'yicha, `updatedAt` emas: keyinchalik admin
    // izoh qo'shsa, topshirish sanasi siljib ketmasin.
    prisma.delivery.count({
      where: { ...mine, status: 'DELIVERED', deliveredAt: { gte: dayStart } },
    }),
    prisma.delivery.count({
      where: { ...mine, status: 'FAILED', updatedAt: { gte: dayStart } },
    }),
    prisma.delivery.count({
      where: { ...mine, status: { in: ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED'] } },
    }),
    prisma.delivery.count({ where: { ...mine, status: 'DELIVERED' } }),
  ]);

  return {
    today: { delivered: todayDelivered, failed: todayFailed },
    active,
    allTimeDelivered,
  };
}
