// Kuryer shartnomasi.
//
// Qoidalar SERVERDA qoladi va javobda HISOBLANGAN holda keladi:
// `nextStatuses`, `claimed`, `hasProofPhoto`. Klient ularni o'zi
// chiqarmaydi — ADR 0009 dagi asosiy chegara shu.

import {
  cursorPageSchema,
  isoDateTimeSchema,
  localizedTextSchema,
  moneySchema,
  phoneSchema,
  uuidSchema,
} from './common.ts';
import { z } from './zod.ts';

export const deliveryStatusSchema = z
  .enum(['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'FAILED', 'RETURNED'])
  .openapi('DeliveryStatus');

/**
 * Yo'nalish.
 *
 * Buyurtma holatidan TAXMIN QILIB BO'LMAYDI: bitta buyurtmada avval
 * yetkazish, keyin qaytarish bo'lishi mumkin va ikkalasi bir vaqtda
 * mavjud bo'ladi.
 */
export const deliveryKindSchema = z.enum(['OUTBOUND', 'RETURN']).openapi('DeliveryKind');

export const deliveryItemSchema = z
  .object({
    id: uuidSchema,
    quantity: z.number().int().positive(),
    nameSnapshot: localizedTextSchema,
  })
  .openapi('DeliveryItem');

/**
 * Topshiriqdagi buyurtma ma'lumoti.
 *
 * ALOHIDA nomlangan sxema: ichkariga yozilsa OpenAPI uni anonim
 * obyekt deb chiqaradi va Dart generatori undan `Map<String, dynamic>`
 * yasardi — ya'ni tiplar yo'qolardi.
 */
export const deliveryOrderSchema = z
  .object({
    id: uuidSchema,
    number: z.string(),
    grandTotal: moneySchema,
    placedAt: isoDateTimeSchema,
    notes: z.string().nullable(),
    recipientName: z.string().nullable(),
    recipientPhone: phoneSchema.nullable(),
    itemCount: z.number().int().nonnegative(),
    /**
     * Qaytarishda — buyurtmaning FAQAT shu topshiriqqa tegishli
     * qismi. Oddiy yetkazishda butun buyurtma.
     */
    items: z.array(deliveryItemSchema),
  })
  .openapi('DeliveryOrder');

export const deliverySchema = z
  .object({
    id: uuidSchema,
    kind: deliveryKindSchema,
    status: deliveryStatusSchema,
    method: z.string(),
    /** `RETURN` da — mijozning manzili (shu yerdan OLIB KETILADI). */
    pickupAddress: z.string().nullable(),
    destinationAddress: z.string(),
    destinationLat: z.number().nullable(),
    destinationLng: z.number().nullable(),
    assignedAt: isoDateTimeSchema.nullable(),
    pickedUpAt: isoDateTimeSchema.nullable(),
    deliveredAt: isoDateTimeSchema.nullable(),
    failureReason: z.string().nullable(),
    createdAt: isoDateTimeSchema,

    /**
     * Kuryer biriktirilganmi.
     *
     * `ASSIGNED` holati «yetkazishga tayinlandi» degani, «kuryerga
     * biriktirildi» EMAS — egasiz yangi yozuv ham `ASSIGNED` bo'ladi.
     * Klient bu farqni holatdan topa olmaydi, shuning uchun server
     * aytadi.
     */
    claimed: z.boolean(),

    /**
     * Isbot surati biriktirilganmi.
     *
     * Yo'lning O'ZI qaytmaydi: suratda mijozning uyi va eshigi bo'ladi.
     */
    hasProofPhoto: z.boolean(),

    /** Ruxsat etilgan keyingi holatlar — klient tugmalarni shundan chizadi. */
    nextStatuses: z.array(deliveryStatusSchema),

    order: deliveryOrderSchema,
  })
  .openapi('Delivery');

export const courierDeliveriesSchema = z
  .object({
    /** O'ziga biriktirilgan, hali tugamagan topshiriqlar. */
    mine: z.array(deliverySchema),
    /** Egasiz topshiriqlar — istalgan kuryer olishi mumkin. */
    available: z.array(deliverySchema),
  })
  .openapi('CourierDeliveries');

export const courierHistorySchema = cursorPageSchema(deliverySchema).openapi('CourierHistory');

/**
 * Kuryer ko'rsatkichlari.
 *
 * «Bugun» SERVERDA, Toshkent vaqtida hisoblanadi: qurilma zonasi
 * boshqa bo'lsa kun chegarasi siljib ketardi.
 *
 * Daromad YO'Q — sxemada kuryer to'lovi modeli yo'q va har qanday
 * summa to'qima bo'lardi.
 */
export const courierStatsSchema = z
  .object({
    today: z.object({
      delivered: z.number().int().nonnegative(),
      failed: z.number().int().nonnegative(),
    }),
    active: z.number().int().nonnegative(),
    allTimeDelivered: z.number().int().nonnegative(),
  })
  .openapi('CourierStats');

export type Delivery = z.infer<typeof deliverySchema>;
export type CourierDeliveries = z.infer<typeof courierDeliveriesSchema>;
export type CourierHistory = z.infer<typeof courierHistorySchema>;
export type CourierStats = z.infer<typeof courierStatsSchema>;
