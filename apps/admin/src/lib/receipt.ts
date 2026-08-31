// To'lov cheki `Payment.rawPayload` ichida ikki xil ko'rinishda bo'lishi mumkin:
//
//   • receiptPath — YANGI usul. Blob'dagi yopiq fayl yo'li. Rasm admin
//     sessiyasini tekshiradigan proxy orqali ko'rsatiladi.
//   • receipt     — ESKI usul. Bazaga base64 data-URL bo'lib yozilgan cheklar.
//     Bunday buyurtmalar bazada allaqachon bor, shuning uchun ularni ko'rsatish
//     ATAYLAB saqlab qolindi — aks holda eski buyurtmalarning cheki yo'qolardi.
//
// Ikkalasi ham <img src> ga tushadigan qiymatga aylantiriladi, shu sababli
// interfeys tomonida farq bilinmaydi.

export interface ManualCardPayload {
  kind?: string;
  /** Yangi: Blob'dagi yopiq fayl yo'li. */
  receiptPath?: string;
  /** Eski: base64 data-URL (faqat arxiv buyurtmalarda). */
  receipt?: string;
  note?: string | null;
}

export function manualCardPayload(raw: unknown): ManualCardPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const payload = raw as ManualCardPayload;
  return payload.kind === 'MANUAL_CARD' ? payload : null;
}

/** Chekni ko'rsatish uchun `src` qiymati. Chek bo'lmasa — null. */
export function receiptSrc(payload: ManualCardPayload | null): string | null {
  if (!payload) return null;
  if (payload.receiptPath) {
    return `/api/orders/receipt-image?p=${encodeURIComponent(payload.receiptPath)}`;
  }
  return payload.receipt ?? null;
}
