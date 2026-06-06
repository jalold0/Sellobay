import { messages } from '@ecom/i18n';
import { getRequestConfig } from 'next-intl/server';

const LOCALES = ['uz', 'ru', 'en'] as const;
type Locale = (typeof LOCALES)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = LOCALES.includes(requested as Locale) ? (requested as Locale) : 'uz';
  return {
    locale,
    messages: messages[locale],
    timeZone: 'Asia/Tashkent',
  };
});
