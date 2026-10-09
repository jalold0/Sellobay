// Katalog shartnomasi — mahsulot, kategoriya, brend.
//
// Bu sxemalar MAVJUD javoblardan yozilgan, ularni o'zgartirmaydi:
// maqsad avval haqiqatni qayd etish, keyin undan tip generatsiya
// qilish. Shakl o'zgarsa, sxema ham o'zgaradi va Dart modeli birga
// yangilanadi.
//
// Bu yo'llar ilgari konvertsiz, xom javob qaytarardi. Endi ular ham
// `{ success, data }` ichida keladi — klientda ikkita alohida metod
// (`get` / `getRaw`) saqlashga ehtiyoj qolmaydi.

import {
  currencySchema,
  localizedTextSchema,
  moneySchema,
  numberedPageSchema,
  uuidSchema,
} from './common.ts';
import { z } from './zod.ts';

export const brandRefSchema = z
  .object({ id: uuidSchema, slug: z.string(), name: z.string() })
  .nullable();

export const categoryRefSchema = z
  .object({ id: uuidSchema, slug: z.string(), name: localizedTextSchema })
  .nullable();

/**
 * Ro'yxatdagi mahsulot — katalog kartochkasi uchun YETARLI, ortiqchasi yo'q.
 *
 * To'liq tavsif, barcha rasmlar va variantlar bu yerda YO'Q: katalogda
 * 24 ta mahsulot keladi va har biriga to'liq ma'lumot qo'shilsa, javob
 * o'nlab barobar kattalashardi. Ular `productDetailSchema` da.
 */
export const productListItemSchema = z
  .object({
    id: uuidSchema,
    slug: z.string(),
    sku: z.string(),
    name: localizedTextSchema,
    price: moneySchema,
    /** Chegirmagacha bo'lgan narx. `null` — chegirma yo'q. */
    oldPrice: moneySchema.nullable(),
    currency: currencySchema,
    /**
     * O'rtacha baho, 0..5.
     *
     * `number` — bu PUL EMAS, o'lchov. Aniqlik muhim emas va
     * klientda `4.8` ko'rinishida chiziladi.
     */
    rating: z.number().min(0).max(5),
    reviewCount: z.number().int().nonnegative(),
    soldCount: z.number().int().nonnegative(),
    isFeatured: z.boolean(),
    brand: brandRefSchema,
    category: categoryRefSchema,
    imageUrl: z.string().nullable(),
    /** Barcha variantlar bo'yicha jami qoldiq. */
    stock: z.number().int().nonnegative(),
    /**
     * Sotuvga tayyormi.
     *
     * `stock > 0` dan KELIB CHIQADI, lekin alohida maydon sifatida
     * yuboriladi: qoida serverda bitta joyda tursin. Klient uni o'zi
     * hisoblasa, kelajakda «zaxirada yo'q, lekin buyurtma berish
     * mumkin» qoidasi qo'shilganda har bir klientni tuzatish kerak
     * bo'lardi.
     */
    inStock: z.boolean(),
  })
  .openapi('ProductListItem');

export const productListSchema = numberedPageSchema(productListItemSchema).openapi('ProductList');

export const categorySchema = z
  .object({
    id: uuidSchema,
    slug: z.string(),
    name: localizedTextSchema,
    productCount: z.number().int().nonnegative().optional(),
  })
  .openapi('Category');

export const brandSchema = z
  .object({ id: uuidSchema, slug: z.string(), name: z.string() })
  .openapi('Brand');

export type ProductListItem = z.infer<typeof productListItemSchema>;
export type ProductList = z.infer<typeof productListSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Brand = z.infer<typeof brandSchema>;
