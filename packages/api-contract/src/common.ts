// Domenlar bo'ylab TAKRORLANADIGAN primitivlar.
//
// Bu yerdagi qarorlar ikkala tarafga ham tegadi: TypeScript tipi ham,
// generatsiya qilinadigan Dart modeli ham shulardan kelib chiqadi.

import { z } from './zod.ts';

/**
 * PUL — satr, `number` EMAS.
 *
 * `double` 0.1 + 0.2 ni aniq hisoblamaydi va JSON `number` aynan
 * shunga aylanadi. Bazada `Decimal(14,2)`, tarmoqda satr, Dart'da
 * `Decimal` paketi. Qoida CLAUDE.md da yozilgan va shu yerda
 * majburlanadi: narx maydoni `z.number()` bo'lsa, u xato.
 *
 * Format: `"620000"` yoki `"620000.50"` — guruh ajratgichsiz,
 * valyuta belgisisiz. Formatlash KLIENT ishi (til va mintaqaga bog'liq).
 */
export const moneySchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, 'Pul miqdori satr sifatida uzatiladi')
  // `format` — Dart generatori uchun BELGI: bu maydon `String` emas,
  // `Decimal` bo'lib chiqadi. Belgisiz generator uni oddiy satr deb
  // yozardi va klientda pul ustida arifmetika qilib bo'lmasdi.
  .openapi({ format: 'money', example: '620000.00', description: 'Decimal(14,2) satr sifatida' });

/** Valyuta — hozircha faqat UZS, lekin maydon shartnomada bor. */
export const currencySchema = z.string().length(3).openapi({ example: 'UZS' });

/**
 * Ko'p tilli matn.
 *
 * Uchala til ham IXTIYORIY: tarjima yetishmasligi mumkin va shunda
 * klient `pickLocalized()` bilan zaxiraga tushadi. Majburiy qilsak,
 * yangi mahsulot qo'shish uchun uchala tilni bir vaqtda to'ldirish
 * shart bo'lardi.
 */
export const localizedTextSchema = z
  .object({ uz: z.string().optional(), ru: z.string().optional(), en: z.string().optional() })
  .openapi({ example: { uz: 'Nike Air Max', ru: 'Nike Air Max' } });

export const uuidSchema = z.string().uuid();

/** ISO 8601, UTC. Vaqt zonasi KLIENTDA qo'llanadi (Asia/Tashkent). */
export const isoDateTimeSchema = z
  .string()
  .datetime()
  .openapi({ example: '2026-10-05T09:00:00.000Z' });

/**
 * Kursor bo'yicha sahifalash.
 *
 * Ofset EMAS: ro'yxat o'zgarib turadi (yangi buyurtma, tugagan
 * topshiriq) va ofset bilan o'qisak, ayrim yozuvlar ikki marta
 * chiqib, ayrimlari butunlay tushib qolardi.
 */
export function cursorPageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    /** `null` — oxiri. Klient O'ZI hisoblamaydi. */
    nextCursor: z.string().nullable(),
  });
}

/** Sahifa raqami bo'yicha — katalogda qoladi (SEO va «3-sahifa» havolasi). */
export function numberedPageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    hasMore: z.boolean(),
  });
}

/** Telefon — E.164, `@ecom/utils/normalizeUzPhone` orqali. */
export const phoneSchema = z
  .string()
  .regex(/^\+998\d{9}$/, 'Telefon +998XXXXXXXXX ko`rinishida')
  .openapi({ example: '+998901234567' });
