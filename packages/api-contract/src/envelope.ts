// API javob konverti — BARCHA route'lar uchun bitta shakl.
//
// NEGA KERAK: ilgari ikki xil shakl yonma-yon yashardi. 43 route
// `{ success, data }` qaytarardi, 6 ta katalog route'i esa foydali
// yukni to'g'ridan-to'g'ri, xatoni `{ error: "matn" }` ko'rinishida.
// Natijada Flutter klientida ikkita alohida metod paydo bo'ldi
// (`get` va `getRaw`), va ulardan NOTO'G'RISINI chaqirish muvaffaqiyatli
// javobni ham xato deb ko'rsatardi.
//
// CHEGARA: tashqi protokollar bu konvertga O'TKAZILMAYDI. Payme
// JSON-RPC 2.0 da, Click `{ error, error_note }` da javob kutadi —
// formatni to'lov tizimi belgilaydi, biz emas. `/api/health` ham
// monitoring vositalari uchun sodda qoladi.

import { z } from './zod.ts';

/**
 * Xato kodi — MASHINA uchun. Klient shu bo'yicha qaror qabul qiladi
 * (`NOT_PURCHASED` da forma yashiriladi, `STATE_CHANGED` da ro'yxat
 * yangilanadi). Matn esa odam uchun va o'zgarishi mumkin.
 */
export const apiErrorSchema = z.object({
  code: z.string(),
  /** Foydalanuvchiga ko'rsatiladigan TAYYOR matn (server tilida). */
  message: z.string(),
  /** Validatsiya xatolari — maydon nomi -> sabab. */
  fields: z.record(z.string()).optional(),
});

export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

export const apiFailureSchema = z.object({
  success: z.literal(false),
  error: apiErrorSchema,
  /**
   * So'rov identifikatori — log bilan bog'lash uchun.
   *
   * Xato javobida HAR DOIM bo'ladi: foydalanuvchi skrinshot yuborsa,
   * shu id bo'yicha Sentry'dan aniq chaqiruv topiladi. Muvaffaqiyatli
   * javobda yo'q — u yerda kerak emas va har javobni kattalashtirardi.
   */
  requestId: z.string().optional(),
});

/** Muvaffaqiyatli javob — `data` ichidagi shakl har resursda boshqacha. */
export function apiSuccessSchema<T extends z.ZodTypeAny>(data: T) {
  return z.object({ success: z.literal(true), data });
}

/** To'liq javob (ikkala tarmoq). Klient tipini shundan oladi. */
export function apiResponseSchema<T extends z.ZodTypeAny>(data: T) {
  return z.union([apiSuccessSchema(data), apiFailureSchema]);
}

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = { success: false; error: ApiErrorBody; requestId?: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

/**
 * Standart xato kodlari.
 *
 * Ro'yxat YOPIQ emas — domen o'z kodini qo'shishi mumkin
 * (`NOT_PURCHASED`, `PROOF_NOT_ALLOWED`). Bu yerdagilar esa har
 * joyda bir xil ma'noga ega bo'lishi SHART, aks holda klient
 * `UNAUTHENTICATED` ni bir joyda sessiya tugashi, boshqasida huquq
 * yetishmasligi deb tushunardi.
 */
export const COMMON_ERROR_CODES = {
  /** Sessiya yo'q yoki tugagan — klient kirish ekraniga chiqaradi. */
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  /** Kirgan, lekin huquqi yetmaydi — qayta kirish YORDAM BERMAYDI. */
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  /** Holat parallel o'zgargan — klient qayta o'qishi kerak. */
  STATE_CHANGED: 'STATE_CHANGED',
  RATE_LIMITED: 'RATE_LIMITED',
  /** Kutilmagan server xatosi — tafsilot klientga CHIQMAYDI. */
  INTERNAL: 'INTERNAL',
} as const;

export type CommonErrorCode = (typeof COMMON_ERROR_CODES)[keyof typeof COMMON_ERROR_CODES];
