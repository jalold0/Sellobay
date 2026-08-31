// Karta orqali qo'lda to'lov (manual card transfer) — konfiguratsiya + chek validatsiyasi.
//
// Payme/Click merchant hisobisiz ishlaydigan oqim:
//   1) Mijozga platforma kartasi ko'rsatiladi (bu yerdagi kartalar).
//   2) Mijoz o'tkazadi va chek (skrinshot) yuklaydi → buyurtma PENDING + Payment PENDING(+chek).
//   3) Admin chekni ko'rib to'lovni tasdiqlaydi → Payment PAID + buyurtma PAID → fulfillment.
//
// Provayder sifatida MAVJUD `UZCARD` ishlatiladi (yangi enum/migration shart emas).

import { FOLDER, MAX_RECEIPT_BYTES, checkImageBytes, putPrivateImage } from '@ecom/storage';

export interface PaymentCard {
  number: string; // "8600 1234 5678 9012"
  holder: string; // karta egasi (ism yoki tashkilot)
  bank?: string; // Uzcard / Humo / bank nomi
}

// Prod'da MANUAL_PAYMENT_CARDS env'iga JSON qo'yiladi, masalan:
//   MANUAL_PAYMENT_CARDS='[{"number":"8600 1234 5678 9012","holder":"SELLOBAY MCHJ","bank":"Uzcard"}]'
// Dev/test uchun namuna kartalar (aniq TEST deb belgilangan).
const DEV_FALLBACK_CARDS: PaymentCard[] = [
  { number: '8600 0000 0000 0000', holder: 'SELLOBAY TEST', bank: 'Uzcard' },
  { number: '9860 0000 0000 0000', holder: 'SELLOBAY TEST', bank: 'Humo' },
];

/** Platforma to'lov kartalari (env yoki dev fallback). */
export function getPaymentCards(): PaymentCard[] {
  const raw = process.env.MANUAL_PAYMENT_CARDS?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PaymentCard[];
      if (Array.isArray(parsed)) {
        const clean = parsed
          .filter((c) => c && typeof c.number === 'string' && typeof c.holder === 'string')
          .slice(0, 4);
        if (clean.length > 0) return clean;
      }
    } catch {
      // noto'g'ri JSON — fallback'ga o'tamiz
    }
  }
  return DEV_FALLBACK_CARDS;
}

// ─── Chek (kvitansiya) rasmi ────────────────────────────────────────────
//
// Chek endi Vercel Blob'da YOPIQ fayl bo'lib saqlanadi, bazada esa faqat uning
// ichki yo'li turadi. Ilgari u base64 data-URL bo'lib Postgres'ga yozilardi:
// bitta chek ~3.5 MB matn edi, ya'ni baza rezerv nusxasi va har bir so'rov
// og'irlashardi, rasm esa CDN'siz uzatilardi.
//
// Klient ikki xil qiymat yuborishi mumkin:
//   • `receipts/...` — /api/uploads/receipt orqali oldindan yuklangan fayl yo'li
//     (web va yangi mobil ilova shuni yuboradi);
//   • `data:image/...` — ESKI mobil ilova buildlari. Ular hali foydalanuvchilar
//     telefonida bo'lgani uchun ATAYLAB qabul qilinadi, lekin bazaga tushmaydi:
//     server uni o'zi Blob'ga ko'chiradi va baribir yo'lni saqlaydi.

/** Blob do'konidagi cheklar papkasi — bazadagi yo'l shu bilan boshlanadi. */
const RECEIPT_PATH_PREFIX = `${FOLDER.receipts}/`;

const ALLOWED_RECEIPT_PREFIXES = ['data:image/jpeg', 'data:image/png', 'data:image/webp'];
// ~3.7MB dekodlangan rasmga to'g'ri keladi (base64 ~1.37x).
const MAX_RECEIPT_CHARS = 5_000_000;

/** Chekni saqlashda yuzaga kelgan, foydalanuvchiga ko'rsatiladigan xato. */
export class ReceiptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReceiptError';
  }
}

export type ReceiptRef =
  | { kind: 'path'; pathname: string }
  | { kind: 'legacyDataUrl'; dataUrl: string };

export type ReceiptCheck = { ok: true; ref: ReceiptRef } | { ok: false; error: string };

/** Klientdan kelgan chek qiymatini tekshiradi (tarmoqqa chiqmaydi). */
export function parseReceipt(value: unknown): ReceiptCheck {
  if (typeof value !== 'string' || value.length === 0) {
    return { ok: false, error: 'Chek (kvitansiya) rasmini yuklang' };
  }
  if (value.startsWith(RECEIPT_PATH_PREFIX)) {
    // Yo'l ichida `..` bo'lsa — soxta qiymat, saqlashga yaqinlashtirmaymiz.
    if (value.includes('..') || value.length > 300) {
      return { ok: false, error: 'Chek manzili noto`g`ri' };
    }
    return { ok: true, ref: { kind: 'path', pathname: value } };
  }
  if (ALLOWED_RECEIPT_PREFIXES.some((p) => value.startsWith(p))) {
    if (value.length > MAX_RECEIPT_CHARS) {
      return { ok: false, error: 'Chek rasmi juda katta (maks ~3.5MB)' };
    }
    return { ok: true, ref: { kind: 'legacyDataUrl', dataUrl: value } };
  }
  return { ok: false, error: 'Chek rasmi JPEG, PNG yoki WEBP formatida bo`lishi kerak' };
}

/**
 * Chekni saqlab, bazaga yoziladigan yo'lni qaytaradi.
 * Yo'l allaqachon berilgan bo'lsa — o'sha qaytadi (fayl yuklash paytida saqlangan).
 * Eski data-URL bo'lsa — shu yerda Blob'ga ko'chiriladi.
 */
export async function storeReceipt(ref: ReceiptRef): Promise<string> {
  if (ref.kind === 'path') return ref.pathname;

  const base64 = ref.dataUrl.slice(ref.dataUrl.indexOf(',') + 1);
  const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  const check = checkImageBytes(bytes, MAX_RECEIPT_BYTES);
  if (!check.ok) throw new ReceiptError(check.error);

  const stored = await putPrivateImage(FOLDER.receipts, bytes, check.image);
  return stored.pathname;
}

/** UZCARD — qo'lda tasdiqlanadigan karta to'lovi provayderi. */
export const MANUAL_CARD_PROVIDER = 'UZCARD' as const;
