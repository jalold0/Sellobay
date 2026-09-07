// UUID tekshiruvi.
//
// Nega kerak: mijoz tomonidagi ro'yxatlarda (savat, sevimlilar, oxirgi
// ko'rilganlar) UUID BO'LMAGAN id'lar uchrab turadi — dev rejimdagi mock
// katalog 'g-' prefiksli id ishlatadi. Ular serverga yuborilsa
// `z.string().uuid()` validatsiyasi butun so'rovni rad etadi, ya'ni bitta
// mock element haqiqiy elementlarning ham sinxronini buzadi. Shu sababli
// yuborishdan oldin filtrlanadi.
//
// Ilgari shu regex web'da inline yozilgan edi; mobil tomonda esa umuman
// tekshirilmasdi.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Satr UUID formatidami (versiyadan qat'i nazar). */
export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** Ro'yxatdan faqat UUID'larni qoldiradi va takrorlarni olib tashlaydi. */
export function onlyUuids(values: readonly unknown[]): string[] {
  return Array.from(new Set(values.filter(isUuid)));
}
