// Tovar xususiyatlari (Product.specs): material, tarkib, mamlakat...
//
// Sotuvchi kiritadi, mijoz tovar sahifasida ko'radi. Ma'lum kalitlarning
// nomi tarjimadan olinadi (`product.spec.<key>`), shuning uchun ru/en
// sahifada ham to'g'ri chiqadi; boshqa xususiyat uchun sotuvchi nomini
// o'zi yozadi (`label`).
//
// Bazada Json saqlanadi — o'qishda ishonchsiz deb qaraladi: buzuq yozuv
// sahifani yiqitmaydi, shunchaki tashlab yuboriladi.

export const PRODUCT_SPEC_KEYS = [
  'material',
  'composition',
  'country',
  'season',
  'care',
  'warranty',
] as const;

export type ProductSpecKey = (typeof PRODUCT_SPEC_KEYS)[number];

export interface ProductSpecEntry {
  /** Ma'lum xususiyat — nomi tarjimadan. */
  key?: ProductSpecKey;
  /** Boshqa xususiyat nomi (sotuvchi yozgan). `key` bo'lmasa shart. */
  label?: string;
  value: string;
}

export const MAX_PRODUCT_SPECS = 20;
export const MAX_SPEC_LABEL = 60;
export const MAX_SPEC_VALUE = 200;

function isKey(v: unknown): v is ProductSpecKey {
  return typeof v === 'string' && (PRODUCT_SPEC_KEYS as readonly string[]).includes(v);
}

function clean(v: unknown): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : '';
}

export type SpecsCheck = { ok: true; specs: ProductSpecEntry[] } | { ok: false; error: string };

/**
 * Sotuvchi yuborgan ro'yxatni tekshiradi va tozalaydi.
 *
 * Bo'sh qiymatli qatorlar jim tashlanadi (forma oxiridagi bo'sh qator
 * xato emas). Bitta kalit ikki marta kelsa — xato: sahifada ikkita
 * «Material» chiqmasin.
 */
export function normalizeProductSpecs(input: unknown): SpecsCheck {
  if (input === null || input === undefined) return { ok: true, specs: [] };
  if (!Array.isArray(input)) return { ok: false, error: 'Xususiyatlar ro`yxat bo`lishi kerak' };

  const specs: ProductSpecEntry[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'Xususiyat noto`g`ri' };
    const row = raw as Record<string, unknown>;
    const value = clean(row.value);
    const label = clean(row.label);
    const key = row.key === undefined || row.key === null || row.key === '' ? undefined : row.key;

    if (!value) continue;
    if (key !== undefined && !isKey(key)) return { ok: false, error: 'Noma`lum xususiyat turi' };
    if (key === undefined && !label) return { ok: false, error: 'Xususiyat nomini yozing' };
    if (label.length > MAX_SPEC_LABEL) {
      return { ok: false, error: `Xususiyat nomi ${MAX_SPEC_LABEL} belgidan oshmasin` };
    }
    if (value.length > MAX_SPEC_VALUE) {
      return { ok: false, error: `Xususiyat qiymati ${MAX_SPEC_VALUE} belgidan oshmasin` };
    }

    const id = key ?? `label:${label.toLowerCase()}`;
    if (seen.has(id)) return { ok: false, error: 'Bir xil xususiyat ikki marta kiritilgan' };
    seen.add(id);

    specs.push(key ? { key, value } : { label, value });
  }
  if (specs.length > MAX_PRODUCT_SPECS) {
    return { ok: false, error: `Eng ko'pi bilan ${MAX_PRODUCT_SPECS} ta xususiyat` };
  }
  return { ok: true, specs };
}

/**
 * Bazadagi Json'ni ko'rsatish uchun o'qiydi. Buzuq yozuvlar tashlanadi,
 * xato otilmaydi — sahifa baribir ochilishi kerak.
 */
export function readProductSpecs(json: unknown): ProductSpecEntry[] {
  if (!Array.isArray(json)) return [];
  const out: ProductSpecEntry[] = [];
  for (const raw of json) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const value = clean(row.value);
    if (!value) continue;
    if (isKey(row.key)) out.push({ key: row.key, value });
    else if (clean(row.label)) out.push({ label: clean(row.label), value });
  }
  return out.slice(0, MAX_PRODUCT_SPECS);
}
