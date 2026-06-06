import en from './locales/en.json';
import ru from './locales/ru.json';
import uz from './locales/uz.json';

export const locales = ['uz', 'ru', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'uz';

export const messages: Record<Locale, Record<string, string>> = {
  uz: uz as Record<string, string>,
  ru: ru as Record<string, string>,
  en: en as Record<string, string>,
};

export function t(key: string, locale: Locale = defaultLocale): string {
  return messages[locale]?.[key] ?? messages[defaultLocale]?.[key] ?? key;
}

export function pickLocalized<T extends Partial<Record<Locale, string>>>(
  value: T | null | undefined,
  locale: Locale = defaultLocale,
): string {
  if (!value) return '';
  return value[locale] ?? value[defaultLocale] ?? Object.values(value)[0] ?? '';
}
