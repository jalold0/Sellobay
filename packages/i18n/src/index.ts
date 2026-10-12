import en from './locales/en.json';
import ru from './locales/ru.json';
import uz from './locales/uz.json';

export const locales = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'uz';

// next-intl uses nested key structure (common.appName, nav.cart, ...)
// shu sababli `any` qabul qilamiz — next-intl o'zi tip xavfsizligini ta'minlaydi.
export type Messages = Record<string, unknown>;

export const messages: Record<Locale, Messages> = {
  uz: uz as Messages,
  ru: ru as Messages,
  en: en as Messages,
};

// Yengil t() helper — server-side fallback uchun, dot-notation kalit (common.appName)
export function t(key: string, locale: Locale = defaultLocale): string {
  const parts = key.split('.');
  let cur: unknown = messages[locale] ?? messages[defaultLocale];
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      cur = undefined;
      break;
    }
  }
  return typeof cur === 'string' ? cur : key;
}

// Yagona amalga oshirish — `./pick` (panellar JSON'siz import qiladi).
export { pickLocalized } from './pick';
