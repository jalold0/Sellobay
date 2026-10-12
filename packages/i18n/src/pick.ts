// Ko'p tilli maydondan (`{ uz, ru, en }`) kerakli tilni olish.
//
// Alohida modul (`@ecom/i18n/pick`): asosiy `index.ts` uchala til JSON'ini (≈170 KB) import
// qiladi — admin va seller panellari faqat shu funksiya uchun ularni bundle'ga olmasin.

export const pickLocales = ['uz', 'ru', 'en'] as const;
export type PickLocale = (typeof pickLocales)[number];

/** Tanlangan til → o'zbekcha → birinchi mavjud qiymat. Oddiy satr berilsa — o'zi. */
export function pickLocalized(
  value: Partial<Record<PickLocale, string>> | string | null | undefined,
  locale: PickLocale = 'uz',
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value[locale] ?? value.uz ?? Object.values(value).find(Boolean) ?? '';
}
