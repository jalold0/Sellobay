// Kuryer yetkazishlari — biznes-servis (application qatlami).
// HTTP'ga bog'liq emas; route faqat auth/parse qilib shu yerga keladi.
//
// NEGA BU FAYL PAYDO BO'LDI:
// `Delivery`, `DeliveryEvent` va `Courier` jadvallari sxemada bor edi,
// lekin ularga HECH KIM yozmasdi — jonli koddagi yagona havola
// karantindagi `graveyard/api` da edi. Natijada kuryer ilovasi
// ko'rsatadigan ma'lumot umuman yo'q edi.

import { ApiDomainError } from '@ecom/api-contract';
import {
  MAX_HANDOVER_ATTEMPTS,
  checkHandover,
  formatParcelCode,
  parseScan,
  tashkentDayStart,
} from '@ecom/core-domain';
import { Prisma, type CustodyMethod, type DeliveryStatus, type OrderStatus } from '@ecom/database';
import { ensureDeliveryCodes, restockReturnDelivery, settleDeliveredOrder } from '@ecom/order-ops';
import { getPushService } from '@ecom/push';

import { prisma } from '@/lib/db';

/**
 * `ApiDomainError` dan meros: `withApi()` uni BOSHQA domen xatolari
 * bilan birga, bitta joyda ushlaydi. Ilgari har route o'zining
 * `catch (e) { if (e instanceof CourierError) ... }` blokini yozardi va
 * blok unutilsa, tushunarli xato kutilmagan 500 ga aylanardi.
 */
export class CourierError extends ApiDomainError {}

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

/** Bekor qilingan yoki qaytarilgan buyurtma mijozga olib borilmaydi. */
const NOT_SHIPPABLE_ORDER_STATUSES: OrderStatus[] = ['CANCELLED', 'RETURNED', 'REFUNDED'];

/**
 * Pul masalasi hal bo'lgan buyurtma: to'langan YOKI naqd (pul yetkazilganda
 * olinadi). `@ecom/core-domain` dagi to'lov holati PAID / COD_PENDING bilan
 * bir xil ma'no; bu yerda Prisma sharti, chunki tekshiruv atomik bo'lishi kerak.
 *
 * NEGA: ilgari kuryer ro'yxati faqat `courierId: null` ga qarardi — onlayn
 * to'lanmagan (Click/Payme webhook kelmagan, UZCARD cheki tasdiqlanmagan) va
 * bekor qilingan buyurtmalar ham olib ketilardi (audit K3).
 */
const PAYMENT_SETTLED_OR_COD: Prisma.OrderWhereInput = {
  OR: [
    { paidAt: { not: null } },
    { payments: { some: { status: 'PAID' } } },
    { payments: { some: { provider: 'CASH_ON_DELIVERY', status: 'PENDING' } } },
  ],
};

/** Mijozga olib borishni boshlash mumkin bo'lgan buyurtma. */
const SHIPPABLE_ORDER: Prisma.OrderWhereInput = {
  status: { notIn: NOT_SHIPPABLE_ORDER_STATUSES },
  ...PAYMENT_SETTLED_OR_COD,
  // Bir nechta sotuvchining tovari omborda yig'ilib, bitta bo'lib jo'naydi (ADR 0015): hali
  // kelmagan jo'natma bo'lsa buyurtma olib ketishga tayyor emas. Jo'natmasi yo'q (eski)
  // buyurtmalarga ta'sir qilmaydi.
  sellerShipments: { none: { status: { in: ['NEW', 'ACCEPTED', 'PACKED'] } } },
  // Global (Xitoy) buyurtma — tovar kargo bilan omborimizga kelib, admin «Qadoqlandi» qilgandan
  // keyingina (ADR 0015). Ilgari to'lov bilanoq ro'yxatga chiqardi — tovar hali Xitoyda edi.
  NOT: {
    globalFulfillment: { isNot: null },
    status: { notIn: ['PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'] },
  },
};

/**
 * Istalgan kuryer o'ziga ola biladigan yetkazish.
 *
 * `RETURN` (mijozdan omborga) ataylab shartsiz: uni admin qaytarilgan
 * buyurtma uchun o'zi ochadi, buyurtma esa allaqachon RETURNED.
 */
const AVAILABLE_DELIVERY: Prisma.DeliveryWhereInput = {
  courierId: null,
  // 3PL'ga topshirilgan yetkazish — o'z kuryerlarimizniki emas (bitta yetkazish — bitta egasi).
  carrier: null,
  status: 'ASSIGNED',
  OR: [
    { kind: 'RETURN' },
    { kind: 'OUTBOUND', order: { ...SHIPPABLE_ORDER, status: { notIn: CLOSED_ORDER_STATUSES } } },
  ],
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

/**
 * Kuryer posilkani tekshirishi uchun pozitsiya ma'lumoti: rasm, SKU va variant.
 *
 * Ilgari faqat nom va son kelardi — bir xil nomli ikki rangdagi ko'ylakni
 * kuryer ajrata olmasdi va noto'g'ri posilkani olib ketish mumkin edi.
 */
const orderItemSelect = {
  id: true,
  quantity: true,
  nameSnapshot: true,
  sku: true,
  variant: {
    select: {
      sku: true,
      attributes: {
        select: {
          optionId: true,
          valueString: true,
          valueNumber: true,
          attribute: { select: { name: true, unit: true } },
        },
      },
    },
  },
  product: {
    select: {
      images: {
        orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
        take: 1,
        select: { url: true },
      },
    },
  },
} satisfies Prisma.OrderItemSelect;

type OrderItemRow = Prisma.OrderItemGetPayload<{ select: typeof orderItemSelect }>;

/** Variant tanlovlari nomlari (`AttributeOption.label`), id bo'yicha. */
export type OptionLabels = ReadonlyMap<string, Prisma.JsonValue>;

function itemView(i: OrderItemRow, quantity: number, options: OptionLabels) {
  return {
    id: i.id,
    quantity,
    nameSnapshot: i.nameSnapshot,
    // Variantning o'z SKU'si aniqroq (rang/o'lcham bo'yicha) — bo'lmasa mahsulotniki.
    sku: i.variant?.sku ?? i.sku,
    imageUrl: i.product.images[0]?.url ?? null,
    variant: (i.variant?.attributes ?? []).map((a) => ({
      name: a.attribute.name,
      value:
        (a.optionId ? options.get(a.optionId) : undefined) ??
        a.valueString ??
        (a.valueNumber !== null
          ? `${a.valueNumber.toString()}${a.attribute.unit ? ` ${a.attribute.unit}` : ''}`
          : null),
    })),
  };
}

const deliverySelect = {
  id: true,
  kind: true,
  status: true,
  method: true,
  pickupAddress: true,
  destinationAddress: true,
  destinationLat: true,
  destinationLng: true,
  assignedAt: true,
  pickedUpAt: true,
  deliveredAt: true,
  failureReason: true,
  proofPhotoUrl: true,
  parcelCode: true,
  handoverAttempts: true,
  handoverMethod: true,
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
      items: { select: orderItemSelect },
      // Naqd (COD) — pul hali olinmagan bo'lsa kuryer eshik oldida oladi.
      payments: {
        where: { provider: 'CASH_ON_DELIVERY', status: 'PENDING' },
        select: { id: true },
        take: 1,
      },
    },
  },
  // Qaytarish topshirig'idagi mahsulotlar — buyurtmaning BIR QISMI.
  // Bo'sh bo'lsa (`OUTBOUND`) butun buyurtma olib boriladi.
  items: {
    select: {
      quantity: true,
      orderItem: { select: orderItemSelect },
    },
  },
} satisfies Prisma.DeliverySelect;

export type DeliveryRow = Prisma.DeliveryGetPayload<{ select: typeof deliverySelect }>;

/** Qatorlardagi variant tanlovlarining nomlarini bitta so'rovda yuklaydi. */
async function loadOptionLabels(rows: DeliveryRow[]): Promise<OptionLabels> {
  const ids = new Set<string>();
  for (const d of rows) {
    const items = [...d.order.items, ...d.items.map((i) => i.orderItem)];
    for (const it of items) {
      for (const a of it.variant?.attributes ?? []) if (a.optionId) ids.add(a.optionId);
    }
  }
  if (ids.size === 0) return new Map();
  const options = await prisma.attributeOption.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, label: true },
  });
  return new Map(options.map((o) => [o.id, o.label]));
}

/** Bazadagi qatorlarni javobga o'giradi (variant nomlari bilan). */
async function present(rows: DeliveryRow[]) {
  const options = await loadOptionLabels(rows);
  return rows.map((d) => serializeDelivery(d, options));
}

async function presentOne(deliveryId: string) {
  const row = await prisma.delivery.findUniqueOrThrow({
    where: { id: deliveryId },
    select: deliverySelect,
  });
  return serializeDelivery(row, await loadOptionLabels([row]));
}

/**
 * Mijozga topshirishda kod so'raladimi.
 *
 * Faqat do'kondan mijozga (`OUTBOUND`). Qaytarishda posilka omborga topshiriladi —
 * u yerda mijoz yo'q.
 */
export function handoverRequired(kind: DeliveryRow['kind']): boolean {
  return kind === 'OUTBOUND';
}

/**
 * Bazadagi qatorni klient javobiga o'giradi.
 *
 * Eksport qilingan — sof funksiya va testda bazasiz tekshiriladi.
 */
export function serializeDelivery(d: DeliveryRow, options: OptionLabels = new Map()) {
  const returnItems = d.items ?? [];
  // Mijozning ismi, telefoni va izohi FAQAT topshiriqni olgan kuryerga. Ilgari har bir kuryer
  // bo'sh ro'yxatdagi 50 tagacha buyurtma egasining ma'lumotini ko'rardi (audit P5). Manzil
  // qoladi — kuryer qaysi topshiriqni olishni shunga qarab tanlaydi.
  const claimed = d.courierId !== null;
  return {
    id: d.id,
    /// `OUTBOUND` — do'kondan mijozga, `RETURN` — mijozdan omborga.
    kind: d.kind,
    status: d.status,
    method: d.method,
    /// `RETURN` da — mijozning manzili (shu yerdan OLIB KETILADI).
    pickupAddress: d.pickupAddress,
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
    /**
     * Yorliqdagi posilka kodi (`SB-XXXX-XXXX`) — faqat olgan kuryerga: u skanerlagan
     * posilka shu ekanini solishtiradi. Topshirish kodi (PIN) bu yerda HECH QACHON yo'q.
     */
    parcelCode: claimed && d.parcelCode ? formatParcelCode(d.parcelCode) : null,
    handover: {
      required: handoverRequired(d.kind),
      attemptsLeft: Math.max(0, MAX_HANDOVER_ATTEMPTS - d.handoverAttempts),
      /** Urinishlar tugagan — faqat surat bilan topshirish qoladi. */
      locked: d.handoverAttempts >= MAX_HANDOVER_ATTEMPTS,
      method: d.handoverMethod,
    },
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
    claimed,
    /** Keyingi mumkin bo'lgan holatlar — klient tugmalarni shunga qarab chizadi. */
    nextStatuses: nextDeliveryStatuses(d.status),
    order: {
      id: d.order.id,
      number: d.order.number,
      grandTotal: d.order.grandTotal.toString(),
      /** Eshik oldida olinadigan naqd pul (`null` — to'langan). Faqat yetkazishda. */
      codAmount:
        d.kind === 'OUTBOUND' && d.order.payments.length > 0 ? d.order.grandTotal.toString() : null,
      placedAt: d.order.placedAt.toISOString(),
      notes: claimed ? d.order.notes : null,
      recipientName: claimed ? (d.order.shippingAddress?.recipientName ?? null) : null,
      recipientPhone: claimed ? (d.order.shippingAddress?.phone ?? null) : null,
      // Qaytarishda buyurtmaning FAQAT bir qismi olinadi (mahsulotlar
      // har xil omborga ketishi mumkin). Shunda ro'yxat topshiriqning
      // o'zidan olinadi, buyurtmadan emas — aks holda kuryer boshqa
      // manzilga ketadigan mahsulotni ham olib ketardi.
      itemCount: returnItems.length > 0 ? returnItems.length : d.order.items.length,
      items:
        returnItems.length > 0
          ? returnItems.map((i) => itemView(i.orderItem, i.quantity, options))
          : d.order.items.map((i) => itemView(i, i.quantity, options)),
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
      where: AVAILABLE_DELIVERY,
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: deliverySelect,
    }),
  ]);

  const [mineOut, availableOut] = await Promise.all([present(mine), present(available)]);
  return { mine: mineOut, available: availableOut };
}

/**
 * Bo'sh yetkazishni o'ziga olish.
 *
 * Poyga holati: ikki kuryer bir vaqtda bossa, `updateMany` dagi
 * `courierId: null` sharti ikkinchisini to'xtatadi (0 qator yangilanadi)
 * — ya'ni bitta yetkazish ikki kishiga tushmaydi.
 */
export async function claimDelivery(
  userId: string,
  deliveryId: string,
  method: CustodyMethod = 'MANUAL',
) {
  const courierId = await ensureCourierProfile(userId);

  // Ro'yxatdagi shartning o'zi — UPDATE ichida, shuning uchun to'lov/bekor
  // holati tekshiruv bilan yozuv orasida o'zgarib qolmaydi.
  const result = await prisma.delivery.updateMany({
    where: { id: deliveryId, ...AVAILABLE_DELIVERY },
    data: { courierId, assignedAt: new Date() },
  });
  if (result.count === 0) {
    const exists = await prisma.delivery.findUnique({
      where: { id: deliveryId },
      select: { id: true, courierId: true, status: true },
    });
    if (!exists) throw new CourierError(404, 'NOT_FOUND', 'Yetkazish topilmadi');
    if (exists.courierId === null && exists.status === 'ASSIGNED') {
      throw new CourierError(
        409,
        'ORDER_NOT_READY',
        "Buyurtma hali yetkazishga tayyor emas: to'lanmagan yoki bekor qilingan",
      );
    }
    throw new CourierError(409, 'ALREADY_CLAIMED', 'Bu yetkazishni boshqa kuryer olgan');
  }

  await prisma.deliveryEvent.create({
    data: { deliveryId, status: 'ASSIGNED', note: 'Kuryer o`ziga oldi', actorId: userId, method },
  });
  // Eski (kodsiz) yetkazish — kuryer olganda kodlar paydo bo'ladi.
  await ensureDeliveryCodes(prisma, deliveryId);

  return presentOne(deliveryId);
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
    /** Qanday bajarildi (skaner yoki tugma). `DELIVERED` da serverning o'zi aniqlaydi. */
    method?: Extract<CustodyMethod, 'MANUAL' | 'SCAN'>;
    /** Mijozga topshirish: mijoz QR'i (butun matn) yoki aytilgan 4 raqam. */
    handover?: HandoverInput;
  } = {},
) {
  const courier = await prisma.courier.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!courier) throw new CourierError(403, 'FORBIDDEN', 'Bu yetkazish sizga biriktirilmagan');

  const current = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    select: {
      id: true,
      kind: true,
      status: true,
      courierId: true,
      orderId: true,
      handoverAttempts: true,
    },
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

  // Kuryer olganidan keyin buyurtma bekor qilingan bo'lishi (yoki tuzatishdan
  // oldin to'lanmagan holda olingan bo'lishi) mumkin — mijozga olib borishni
  // davom ettirib bo'lmaydi. «Bajarilmadi» (FAILED) esa doim ruxsat: kuryer
  // topshiriqni yopa olsin.
  const guardOrder = current.kind === 'OUTBOUND' && next !== 'FAILED';
  if (guardOrder) {
    const shippable = await prisma.order.count({
      where: { id: current.orderId, ...SHIPPABLE_ORDER },
    });
    if (shippable === 0) {
      throw new CourierError(
        409,
        'ORDER_NOT_READY',
        "Buyurtma bekor qilingan yoki to'lanmagan — «Bajarilmadi» deb belgilang",
      );
    }
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

  const method = await resolveCustodyMethod(current, next, extra, proof);

  const now = new Date();
  // Tranzaksiya ichida o'zgargan bo'lsagina push yuboriladi (qayta yozilmagan
  // yoki yopiq buyurtmaga hech narsa ketmaydi).
  let orderChangedTo: OrderStatus | null = null;
  await prisma.$transaction(async (tx) => {
    // Shart bilan yangilash: parallel so'rov holatni allaqachon
    // o'zgartirgan bo'lsa, 0 qator tegadi va biz to'xtaymiz.
    const updated = await tx.delivery.updateMany({
      where: {
        id: deliveryId,
        status: current.status,
        courierId: courier.id,
        // Yuqoridagi tekshiruv bilan shu yozuv orasida bekor qilinsa ham o'tmaydi.
        ...(guardOrder ? { order: SHIPPABLE_ORDER } : {}),
      },
      data: {
        status: next,
        ...(next === 'PICKED_UP' ? { pickedUpAt: now } : {}),
        ...(next === 'DELIVERED' ? { deliveredAt: now } : {}),
        ...(next === 'FAILED' ? { failureReason: extra.note?.trim() ?? null } : {}),
        ...(proof ? { proofPhotoUrl: proof } : {}),
        ...(next === 'DELIVERED' ? { handoverMethod: method } : {}),
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
        actorId: userId,
        method,
      },
    });

    // Qaytarish topshirig'i omborga yetdi — zaxira FAQAT shu paytda qaytadi (tovar qo'lda).
    // Ilgari mijoz «qaytaraman» deganda darhol qaytarilardi (audit Y6). Idempotent.
    if (next === 'DELIVERED' && current.kind === 'RETURN') {
      await restockReturnDelivery(tx, deliveryId, 'RETURN_RECEIVED: kuryer omborga topshirdi');
    }

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
        orderChangedTo = orderNext;
        await tx.orderStatusHistory.create({
          data: {
            orderId: current.orderId,
            status: orderNext,
            comment: ORDER_COMMENT[next] ?? null,
          },
        });
        // Yetkazildi — naqd pul kuryerda olindi (COD PAID) va soldCount++. Ilgari bu faqat
        // admin PATCH'ida edi: kuryer yetkazgan naqd buyurtma «to'lanmagan» qolardi (audit Y10).
        // `changed.count > 0` — DELIVERED'ga o'tish faqat bir marta, demak bu ham bir marta.
        if (orderNext === 'DELIVERED' && current.kind === 'OUTBOUND') {
          await settleDeliveredOrder(tx, current.orderId, now);
        }
      }
    }
  });

  // Push COMMIT'DAN KEYIN: tranzaksiya qaytarilsa mijozga yolg'on xabar ketmasin.
  // `notifyOrderStatus` xato tashlamaydi — kuryer javobini buzmaydi.
  if (orderChangedTo) await getPushService().notifyOrderStatus(current.orderId, orderChangedTo);

  return presentOne(deliveryId);
}

/** Mijozga topshirish kodi: mijoz QR'idagi butun matn yoki og'zaki aytilgan 4 raqam. */
export interface HandoverInput {
  method: 'QR' | 'CODE';
  value: string;
}

/**
 * Bu o'tish QANDAY bajarilganini aniqlaydi va mijozga topshirishni tekshiradi.
 *
 * Mijozga yetkazish (`OUTBOUND` → `DELIVERED`) endi tugma bilan bo'lmaydi
 * (ADR 0017): kuryer mijozdan kod oladi (QR yoki og'zaki). Kod yo'q bo'lsa
 * (mijozning telefoni o'chgan, qo'shniga qoldirildi) — faqat surat VA sabab bilan,
 * `PHOTO` deb belgilanadi va admin ko'radi. Ilgari «yetkazdim» deyish uchun
 * posilkani mijozga berish shart emas edi.
 */
async function resolveCustodyMethod(
  current: { id: string; kind: DeliveryRow['kind']; handoverAttempts: number },
  next: DeliveryStatus,
  extra: { note?: string; method?: CustodyMethod; handover?: HandoverInput },
  proof: string | undefined,
): Promise<CustodyMethod> {
  if (next !== 'DELIVERED' || !handoverRequired(current.kind)) return extra.method ?? 'MANUAL';

  if (extra.handover) {
    const codes = await ensureDeliveryCodes(prisma, current.id);
    if (!codes) throw new CourierError(404, 'NOT_FOUND', 'Yetkazish topilmadi');
    const result = checkHandover(
      { parcelCode: codes.parcelCode, pin: codes.handoverPin, attempts: current.handoverAttempts },
      extra.handover,
    );
    if (result.ok) return extra.handover.method;
    switch (result.reason) {
      case 'LOCKED':
        throw new CourierError(
          409,
          'HANDOVER_LOCKED',
          'Kod ko`p marta noto`g`ri kiritildi — surat va sabab bilan topshiring',
        );
      case 'WRONG_PARCEL':
        throw new CourierError(400, 'HANDOVER_WRONG_PARCEL', 'Bu QR boshqa buyurtmaniki');
      case 'MALFORMED':
        throw new CourierError(400, 'HANDOVER_MALFORMED', 'Bu topshirish kodi emas');
      case 'WRONG_PIN': {
        // Faqat taxmin qilish mumkin bo'lgan xato hisoblanadi (begona QR emas).
        // `lt` sharti: parallel urinishlar chegaradan oshirib yubormaydi.
        await prisma.delivery.updateMany({
          where: { id: current.id, handoverAttempts: { lt: MAX_HANDOVER_ATTEMPTS } },
          data: { handoverAttempts: { increment: 1 } },
        });
        const left = Math.max(0, MAX_HANDOVER_ATTEMPTS - current.handoverAttempts - 1);
        throw new CourierError(
          400,
          'HANDOVER_WRONG_PIN',
          left > 0
            ? `Kod noto\`g\`ri. Yana ${left} ta urinish qoldi`
            : 'Kod noto`g`ri. Endi faqat surat va sabab bilan topshirish mumkin',
        );
      }
    }
  }

  if (proof && extra.note?.trim()) return 'PHOTO';
  throw new CourierError(
    400,
    'HANDOVER_REQUIRED',
    'Mijozdan topshirish kodini oling. Kod bo`lmasa — surat va sabab bilan topshiring',
  );
}

/**
 * Yorliqni skanerlash — posilkani qo'lga olish (ADR 0017).
 *
 * Bitta harakat: egasiz posilka kuryerga biriktiriladi VA «olindi» bo'ladi;
 * o'ziniki bo'lsa faqat «olindi». Ilgari kuryer ro'yxatdan topshiriqni tanlab,
 * qo'lidagi posilka o'sha ekaniga ishonib tugma bosardi — adashish oson edi.
 */
export async function scanParcel(
  userId: string,
  payload: string,
  gps: { latitude?: number; longitude?: number } = {},
) {
  const scan = parseScan(payload);
  if (!scan) throw new CourierError(400, 'SCAN_UNKNOWN', 'Bu Sellobay posilka yorlig`i emas');
  if (scan.kind === 'handover') {
    throw new CourierError(
      400,
      'SCAN_IS_HANDOVER',
      'Bu mijozning topshirish QR kodi — uni buyurtma sahifasida «Topshirish» orqali skanerlang',
    );
  }

  const found = await prisma.delivery.findUnique({
    where: { parcelCode: scan.parcelCode },
    select: { id: true, courierId: true },
  });
  if (!found) throw new CourierError(404, 'PARCEL_NOT_FOUND', 'Bunday posilka topilmadi');

  const courierId = await ensureCourierProfile(userId);
  if (found.courierId === null) {
    await claimDelivery(userId, found.id, 'SCAN');
  } else if (found.courierId !== courierId) {
    throw new CourierError(409, 'PARCEL_OTHER_COURIER', 'Bu posilka boshqa kuryerga biriktirilgan');
  }

  const { status } = await prisma.delivery.findUniqueOrThrow({
    where: { id: found.id },
    select: { status: true },
  });
  if (status === 'ASSIGNED') {
    const delivery = await updateDeliveryStatus(userId, found.id, 'PICKED_UP', {
      method: 'SCAN',
      latitude: gps.latitude,
      longitude: gps.longitude,
    });
    return { delivery, pickedUp: true };
  }
  // Allaqachon qo'lida — shunchaki ochib beramiz (qayta skanerlash xato emas).
  return { delivery: await presentOne(found.id), pickedUp: false };
}

// Toshkent kuni — @ecom/core-domain (testlar shu yerdan import qiladi).
export { tashkentDayStart };

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

/**
 * Kuryerning TUGAGAN topshiriqlari — tarix.
 *
 * `listCourierDeliveries` ataylab faqat faol topshiriqlarni beradi:
 * kuryer kun davomida o'nlab yetkazish qiladi va ularni asosiy
 * ro'yxatda qoldirsak, bugungi ish ko'rinmay ketardi. Tarix esa
 * alohida ekranda, sahifalab o'qiladi.
 *
 * Kursor — `id`, `updatedAt` emas: bir soniyada bir nechta yozuv
 * yangilansa, vaqt bo'yicha sahifalash ularning bir qismini
 * tashlab ketardi yoki ikki marta ko'rsatardi.
 */
export async function listCourierHistory(
  userId: string,
  opts: { cursor?: string; limit?: number } = {},
) {
  const courier = await prisma.courier.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!courier) return { items: [], nextCursor: null };

  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50);

  const rows = await prisma.delivery.findMany({
    where: {
      courierId: courier.id,
      status: { in: ['DELIVERED', 'FAILED', 'RETURNED'] },
    },
    // Eng yangisi tepada.
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    // Keyingisi borligini bilish uchun bittasini ORTIQCHA so'raymiz.
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
    select: deliverySelect,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return {
    items: await present(page),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  };
}
