// Brauzerga yuboriladigan tarjima bo'limlari.
//
// NEGA: `NextIntlClientProvider` ga butun lug'at (`getMessages()`) berilardi — uz.json
// ~63 KB, jumladan kuryer ilovasi, statik sahifalar va server komponentlarining
// matnlari ham. U HAR bir sahifa HTML'iga va HAR bir havola prefetch javobiga
// (~100 KB) qo'shilib, telefonda yuklanish va JSON parse vaqtini oshirardi.
//
// Server komponentlar `getTranslations()` bilan to'liq lug'atni o'qiyveradi — bu
// ro'yxat faqat client komponentlar (`'use client'` + `useTranslations`) uchun.
// Yangi client komponentda yangi bo'lim ishlatilsa, shu yerga qo'shing:
// `client-messages.test.ts` buni tekshiradi.

import type { AbstractIntlMessages } from 'next-intl';

export const CLIENT_NAMESPACES = [
  'auth',
  'cart',
  'categories',
  'checkout',
  'common',
  'cookieBanner',
  'errorPage',
  'footer',
  'global',
  'groupBuy',
  'handover',
  'localeSwitcher',
  'loyalty',
  'nav',
  'order',
  'orderSuccess',
  'product',
  'profile',
  'regions',
  'reviews',
  'sale',
  'search',
  'tracking',
  'utilityBar',
  'wishlist',
] as const;

type Messages = AbstractIntlMessages;

/** Lug'atdan faqat client bo'limlarini oladi. */
export function pickClientMessages(messages: Messages): Messages {
  const out: Messages = {};
  for (const ns of CLIENT_NAMESPACES) {
    const value = messages[ns];
    if (value !== undefined) out[ns] = value;
  }
  return out;
}
