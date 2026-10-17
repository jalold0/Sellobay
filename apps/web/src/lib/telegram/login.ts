// Telegram orqali kirish — sof yordamchilar (ADR 0018). Framework'ga bog'liq emas.
//
// Oqim: brauzer so'rov ochadi (token + qisqa kod) -> t.me/<bot>?start=<token> ->
// botda «Raqamni ulashish» (request_contact) -> webhook raqamni so'rovga yozadi ->
// brauzer so'rovni bir marta iste'mol qilib sessiya oladi.

import crypto from 'node:crypto';

import { normalizeUzPhone } from '@ecom/utils';

/** So'rov umri. Botni ochib, tugmani bosishga yetadi; eskirgan havola ishlamaydi. */
export const TELEGRAM_LOGIN_TTL_SEC = 10 * 60;

/** 32 bayt -> base64url, 43 belgi: Telegram `start` parametri (≤64, [A-Za-z0-9_-]) ga sig'adi. */
export function newLoginToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/** Bazada token emas, faqat xeshi saqlanadi. */
export function hashLoginToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Sayt va botda ko'rsatiladigan 4 xonali kod (aldov havolasini sezish uchun). */
export function newLoginCode(): string {
  return crypto.randomInt(0, 10_000).toString().padStart(4, '0');
}

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export function isLoginToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_RE.test(value);
}

/** `/start <payload>` — payload'ni ajratadi (`/start@SellobayBot x` ham). */
export function parseStartPayload(text: string | undefined): string | null | undefined {
  if (!text) return undefined;
  const m = /^\/start(?:@\w+)?(?:\s+(\S+))?\s*$/.exec(text.trim());
  if (!m) return undefined;
  return m[1] ?? null;
}

export type ContactCheck =
  | { ok: true; phone: string }
  | { ok: false; reason: 'not-own' | 'not-uz' };

/**
 * Faqat foydalanuvchining O'Z kontakti qabul qilinadi: `request_contact` tugmasi
 * yuborgan kontaktda `user_id === from.id`. Qo'lda yuborilgan (begona) kontaktda
 * user_id yo'q yoki boshqa — uni qabul qilish kimningdir raqami bilan kirish bo'lardi.
 */
export function checkContact(
  contact: { phone_number?: string; user_id?: number },
  fromId: number,
): ContactCheck {
  if (!contact.user_id || contact.user_id !== fromId) return { ok: false, reason: 'not-own' };
  const phone = contact.phone_number ? normalizeUzPhone(contact.phone_number) : null;
  if (!phone) return { ok: false, reason: 'not-uz' };
  return { ok: true, phone };
}

/** Telegram tili -> sayt tili. */
export function botLocale(languageCode: string | undefined): 'uz' | 'ru' | 'en' {
  if (languageCode?.startsWith('ru')) return 'ru';
  if (languageCode?.startsWith('en')) return 'en';
  return 'uz';
}

/** Webhook sirini doimiy vaqtda solishtirish. */
export function secretMatches(received: string | null, expected: string): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
