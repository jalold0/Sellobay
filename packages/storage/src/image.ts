// Yuklangan rasmni tekshirish — sof mantiq, tarmoqqa bog'liq emas (shu bois testlanadi).
//
// NEGA fayl BAYTLARI bo'yicha tekshiriladi, `Content-Type` header'i bo'yicha emas:
// header'ni yuboruvchi tomon xohlagancha yozadi. HTML yoki SVG faylni
// `Content-Type: image/jpeg` deb yuborish mumkin. Agar biz shunga ishonib saqlasak,
// keyin uni brauzer HTML sifatida ochishi va ichidagi skript ishga tushishi mumkin
// (stored XSS). Fayl boshidagi "magic bytes" esa faylning haqiqiy turini aytadi va
// uni yuboruvchi tomon soxtalashtira olmaydi — biz shu turni saqlaymiz.
//
// SVG ATAYLAB qabul qilinmaydi: u XML va ichida <script> bo'lishi mumkin.

export type ImageKind = 'jpeg' | 'png' | 'webp';

interface KindMeta {
  ext: 'jpg' | 'png' | 'webp';
  contentType: string;
}

const KIND_META: Record<ImageKind, KindMeta> = {
  jpeg: { ext: 'jpg', contentType: 'image/jpeg' },
  png: { ext: 'png', contentType: 'image/png' },
  webp: { ext: 'webp', contentType: 'image/webp' },
};

/** Mahsulot rasmi — brauzerda kichraytirilgandan keyin bundan oshmaydi. */
export const MAX_PRODUCT_IMAGE_BYTES = 4 * 1024 * 1024;
/** To'lov cheki — telefon skrinshoti, mahsulot rasmidan kichik bo'ladi. */
export const MAX_RECEIPT_BYTES = 3 * 1024 * 1024;

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((b, i) => bytes[i] === b);
}

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff] as const;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46] as const; // "RIFF"
const WEBP_TAG = [0x57, 0x45, 0x42, 0x50] as const; // "WEBP" (8-baytdan boshlab)

/** Fayl boshidagi baytlardan rasm turini aniqlaydi. Rasm bo'lmasa — null. */
export function sniffImageKind(bytes: Uint8Array): ImageKind | null {
  if (startsWith(bytes, JPEG_SIGNATURE)) return 'jpeg';
  if (startsWith(bytes, PNG_SIGNATURE)) return 'png';
  if (
    startsWith(bytes, RIFF_SIGNATURE) &&
    bytes.length >= 12 &&
    WEBP_TAG.every((b, i) => bytes[8 + i] === b)
  ) {
    return 'webp';
  }
  return null;
}

export interface ValidatedImage {
  kind: ImageKind;
  /** Fayl kengaytmasi — haqiqiy turdan olinadi, yuklovchining fayl nomidan EMAS. */
  ext: KindMeta['ext'];
  /** Saqlashda yoziladigan Content-Type — haqiqiy turdan olinadi. */
  contentType: string;
  byteLength: number;
}

export type ImageCheck = { ok: true; image: ValidatedImage } | { ok: false; error: string };

/**
 * Yuklangan baytlarni tekshiradi: bo'sh emasmi, haqiqatan rasmmi, hajmi joizmi.
 * Xato matnlari foydalanuvchiga to'g'ridan-to'g'ri ko'rsatiladi.
 */
export function checkImageBytes(bytes: Uint8Array, maxBytes: number): ImageCheck {
  if (bytes.length === 0) {
    return { ok: false, error: 'Fayl bo`sh' };
  }
  // Hajm avval tekshiriladi: katta faylni turini aniqlashdan oldin rad etamiz.
  if (bytes.length > maxBytes) {
    const mb = (maxBytes / (1024 * 1024)).toFixed(1);
    return { ok: false, error: `Rasm juda katta (maksimum ${mb} MB)` };
  }
  const kind = sniffImageKind(bytes);
  if (!kind) {
    return { ok: false, error: 'Faqat JPEG, PNG yoki WEBP rasm yuklash mumkin' };
  }
  const meta = KIND_META[kind];
  return {
    ok: true,
    image: { kind, ext: meta.ext, contentType: meta.contentType, byteLength: bytes.length },
  };
}
