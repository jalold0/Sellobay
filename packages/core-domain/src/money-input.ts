// Formadan kelgan pul qiymatini tekshirish (audit Y15).
//
// Ilgari `transform(Number)` ishlatilardi: "abc" → NaN, `NaN <= 0` false bo'lgani uchun
// tekshiruvdan o'tib ketardi; "1e400" → Infinity. CLAUDE.md qoidasi: pul `number`'da emas,
// Decimal/string'da. Bu funksiya qiymatni normallashtirilgan o'nlik SATRga aylantiradi
// (Prisma Decimal ustuniga to'g'ridan-to'g'ri yoziladi) yoki `null` qaytaradi.

/** So'm: 2 xonagacha kasr, 0 dan katta, 1 trillion so'mdan kichik (Decimal(14, 2) ga sig'adi). */
const MONEY_RE = /^\d{1,12}(\.\d{1,2})?$/;

export function parseMoneyInput(value: unknown): string | null {
  let s: string;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    s = String(value);
  } else if (typeof value === 'string') {
    // Bo'shliq (NBSP ham — `\s` uni qamraydi) va minglik ajratgichlar ("1 250 000",
    // "1,250,000.50") ruxsat.
    s = value.trim().replace(/\s/g, '');
    if (/^\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(s)) s = s.replace(/,/g, '');
    else s = s.replace(',', '.');
  } else {
    return null;
  }
  if (!MONEY_RE.test(s)) return null;
  const [int = '0', frac] = s.split('.');
  const normalized = `${int.replace(/^0+(?=\d)/, '')}${frac ? `.${frac}` : ''}`;
  if (/^0+(\.0+)?$/.test(normalized)) return null; // 0 so'm — narx emas
  return normalized;
}

/** Eski narx (chizilgan) — yangi narxdan QAT'IY katta bo'lishi shart, aks holda «chegirma» yolg'on. */
export function isValidCompareAtPrice(
  price: string,
  compareAt: string | null | undefined,
): boolean {
  if (compareAt == null) return true;
  return compareMoney(compareAt, price) > 0;
}

/** O'nlik satrlarni float'siz solishtiradi: a>b → 1, a<b → -1, teng → 0. */
export function compareMoney(a: string, b: string): number {
  const [ai = '0', af = ''] = a.split('.');
  const [bi = '0', bf = ''] = b.split('.');
  const A = BigInt(ai + af.padEnd(2, '0'));
  const B = BigInt(bi + bf.padEnd(2, '0'));
  return A === B ? 0 : A > B ? 1 : -1;
}
