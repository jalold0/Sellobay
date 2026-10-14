import { defineRouting } from 'next-intl/routing';

// Tillar va URL prefiksi — middleware ham, navigatsiya ham shu bitta sozlamadan foydalanadi.
export const routing = defineRouting({
  locales: ['uz', 'ru', 'en'],
  defaultLocale: 'uz',
  localePrefix: 'always',
});
