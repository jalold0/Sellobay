// Posilka kodi va mijozga topshirish kodi — sof qoidalar (ADR 0017).
//
// Ikki xil kod bor va ular ATAYLAB ajratilgan:
//
//   • Posilka kodi (`parcelCode`) — posilkaga yopishtiriladigan yorliqdagi QR.
//     U SIR EMAS: yorliq qo'lma-qo'l o'tadi, omborda, mashinada ko'rinib turadi.
//     Vazifasi — «qaysi posilka» ekanini xatosiz aniqlash (kuryer skanerlaydi).
//
//   • Topshirish kodi (`handoverPin`, 4 raqam) — FAQAT mijozda. Kuryer uni
//     mijozdan oladi (QR skanerlab yoki og'zaki) va shu bilan «posilka egasiga
//     topshirildi» isbotlanadi. Shuning uchun u kuryerga hech qachon
//     yuborilmaydi va yorliqqa yozilmaydi.
//
// QR ichidagi matn versiyali prefiks bilan boshlanadi (`SBP1:` / `SBH1:`):
// kamera boshqa QR'ni (masalan to'lov QR'ini) ko'rsa, uni posilka deb
// adashtirmaymiz, format o'zgarsa esa eski yorliqlar ham o'qilaveradi.

/**
 * Crockford base32 — o'qishda adashtiriladigan belgilarsiz (I, L, O, U yo'q).
 * Kuryer kodni qo'lda tersa ham xato kam bo'ladi.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Posilka kodining uzunligi: 32^8 ≈ 10^12 — tasodifan to'qnashish amalda yo'q. */
export const PARCEL_CODE_LENGTH = 8;

/** Topshirish kodida nechta raqam. */
export const HANDOVER_PIN_LENGTH = 4;

/**
 * Noto'g'ri kod necha marta kiritilsa, kod bilan topshirish yopiladi.
 *
 * 4 raqam — 10 000 variant. 5 urinish bilan taxmin qilish ehtimoli 0,05%.
 * Yopilgandan keyin faqat surat bilan topshirish qoladi va uni admin ko'radi.
 */
export const MAX_HANDOVER_ATTEMPTS = 5;

const PARCEL_PREFIX = 'SBP1:';
const HANDOVER_PREFIX = 'SBH1:';

/** Tasodifiy baytlar manbai — testda o'rniga aniq baytlar beriladi. */
export type RandomBytes = (length: number) => Uint8Array;

const cryptoRandom: RandomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));

/** Yangi posilka kodi: 8 belgi, masalan `7K3M9QXZ`. */
export function generateParcelCode(random: RandomBytes = cryptoRandom): string {
  const bytes = random(PARCEL_CODE_LENGTH);
  let out = '';
  // 256 ni 32 ga qoldiqsiz bo'linadi — har belgi teng ehtimolli.
  for (let i = 0; i < PARCEL_CODE_LENGTH; i += 1) out += ALPHABET[(bytes[i] ?? 0) % 32];
  return out;
}

/**
 * Yangi 4 xonali topshirish kodi.
 *
 * 16 bitli son 10 000 ga qoldiqsiz bo'linmaydi, shuning uchun 60 000 dan
 * kattasi tashlab yuboriladi (aks holda kichik kodlar tez-tez chiqardi).
 */
export function generateHandoverPin(random: RandomBytes = cryptoRandom): string {
  for (;;) {
    const bytes = random(2);
    const n = ((bytes[0] ?? 0) << 8) | (bytes[1] ?? 0);
    if (n < 60_000) return String(n % 10_000).padStart(HANDOVER_PIN_LENGTH, '0');
  }
}

/** Yorliqda va ekranda ko'rsatish: `SB-7K3M-9QXZ`. */
export function formatParcelCode(code: string): string {
  return `SB-${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Qo'lda terilgan yoki yorliqdan o'qilgan kodni bazadagi ko'rinishga keltiradi.
 *
 * `sb-7k3m-9qxz`, `7K3M 9QXZ`, `SB7K3M9QXZ` — hammasi `7K3M9QXZ`. Crockford
 * qoidasi bo'yicha O→0, I/L→1 (kuryer adashib tersa ham topiladi).
 * Yaroqsiz bo'lsa — null.
 */
export function normalizeParcelCode(input: string): string | null {
  let s = input.toUpperCase().replace(/[\s-]/g, '');
  if (s.startsWith('SB') && s.length === PARCEL_CODE_LENGTH + 2) s = s.slice(2);
  s = s.replace(/O/g, '0').replace(/[IL]/g, '1');
  if (s.length !== PARCEL_CODE_LENGTH) return null;
  for (const ch of s) if (!ALPHABET.includes(ch)) return null;
  return s;
}

/** Yorliqdagi QR matni. */
export function parcelQrPayload(parcelCode: string): string {
  return `${PARCEL_PREFIX}${parcelCode}`;
}

/** Mijoz ekranidagi QR matni: posilka + kod (kuryer boshqa posilkani topshirib qo'ymasin). */
export function handoverQrPayload(parcelCode: string, pin: string): string {
  return `${HANDOVER_PREFIX}${parcelCode}:${pin}`;
}

export type ScanResult =
  | { kind: 'parcel'; parcelCode: string }
  | { kind: 'handover'; parcelCode: string; pin: string };

const PIN_RE = /^\d{4}$/;

/**
 * Kamera o'qigan (yoki qo'lda terilgan) matnni tushunadi.
 *
 * Prefikssiz matn posilka kodi sifatida sinab ko'riladi — yorliq yirtilgan
 * bo'lsa kuryer kodni qo'lda teradi. Tushunarsiz matn — null.
 */
export function parseScan(raw: string): ScanResult | null {
  const text = raw.trim();
  if (text.toUpperCase().startsWith(HANDOVER_PREFIX)) {
    const [code, pin] = text.slice(HANDOVER_PREFIX.length).split(':');
    const parcelCode = normalizeParcelCode(code ?? '');
    if (!parcelCode || !pin || !PIN_RE.test(pin)) return null;
    return { kind: 'handover', parcelCode, pin };
  }
  const body = text.toUpperCase().startsWith(PARCEL_PREFIX)
    ? text.slice(PARCEL_PREFIX.length)
    : text;
  const parcelCode = normalizeParcelCode(body);
  return parcelCode ? { kind: 'parcel', parcelCode } : null;
}

export type HandoverCheck =
  | { ok: true }
  | { ok: false; reason: 'LOCKED' | 'WRONG_PARCEL' | 'WRONG_PIN' | 'MALFORMED' };

/**
 * Kuryer yuborgan kodni tekshiradi.
 *
 * [submitted] — QR'dan o'qilgan butun matn yoki og'zaki aytilgan 4 raqam.
 * QR bo'lsa posilka ham mos kelishi shart: boshqa buyurtmaning QR'i bilan
 * bu posilkani «topshirib» bo'lmaydi.
 */
export function checkHandover(
  expected: { parcelCode: string; pin: string; attempts: number },
  submitted: { method: 'QR' | 'CODE'; value: string },
): HandoverCheck {
  if (expected.attempts >= MAX_HANDOVER_ATTEMPTS) return { ok: false, reason: 'LOCKED' };
  let pin: string;
  if (submitted.method === 'QR') {
    const scan = parseScan(submitted.value);
    if (!scan || scan.kind !== 'handover') return { ok: false, reason: 'MALFORMED' };
    if (scan.parcelCode !== expected.parcelCode) return { ok: false, reason: 'WRONG_PARCEL' };
    pin = scan.pin;
  } else {
    pin = submitted.value.trim();
    if (!PIN_RE.test(pin)) return { ok: false, reason: 'MALFORMED' };
  }
  return pin === expected.pin ? { ok: true } : { ok: false, reason: 'WRONG_PIN' };
}
