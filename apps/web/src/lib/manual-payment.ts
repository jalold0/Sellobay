// Karta orqali qo'lda to'lov (manual card transfer) — konfiguratsiya + chek validatsiyasi.
//
// Payme/Click merchant hisobisiz ishlaydigan oqim:
//   1) Mijozga platforma kartasi ko'rsatiladi (bu yerdagi kartalar).
//   2) Mijoz o'tkazadi va chek (skrinshot) yuklaydi → buyurtma PENDING + Payment PENDING(+chek).
//   3) Admin chekni ko'rib to'lovni tasdiqlaydi → Payment PAID + buyurtma PAID → fulfillment.
//
// Provayder sifatida MAVJUD `UZCARD` ishlatiladi (yangi enum/migration shart emas).

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

// Chek rasmi data-URL cheklovlari (DB'da base64 saqlanadi).
const ALLOWED_RECEIPT_PREFIXES = ['data:image/jpeg', 'data:image/png', 'data:image/webp'];
// ~3.7MB dekodlangan rasmga to'g'ri keladi (base64 ~1.37x). Katta yuklashning oldini oladi.
const MAX_RECEIPT_CHARS = 5_000_000;

/** Yuklangan chek data-URL'ini tekshiradi. */
export function validateReceiptDataUrl(value: unknown): { ok: true } | { ok: false; error: string } {
  if (typeof value !== 'string' || value.length === 0) {
    return { ok: false, error: 'Chek (kvitansiya) rasmini yuklang' };
  }
  if (!ALLOWED_RECEIPT_PREFIXES.some((p) => value.startsWith(p))) {
    return { ok: false, error: 'Chek rasmi JPEG, PNG yoki WEBP formatida bo`lishi kerak' };
  }
  if (value.length > MAX_RECEIPT_CHARS) {
    return { ok: false, error: 'Chek rasmi juda katta (maks ~3.5MB)' };
  }
  return { ok: true };
}

/** UZCARD — qo'lda tasdiqlanadigan karta to'lovi provayderi. */
export const MANUAL_CARD_PROVIDER = 'UZCARD' as const;
