// Brauzerga yuboriladigan tarjima bo'limlari.
//
// NEGA: `NextIntlClientProvider` ga berilgan lug'at HAR bir sahifa HTML'iga (RSC payload)
// va HAR bir havola prefetch javobiga qo'shiladi; telefonda uni yuklash va parse qilish
// vaqt oladi. Ilgari butun lug'at (~63 KB), keyin barcha client bo'limlari (~40 KB)
// har sahifaga ketardi — bosh sahifa RSC payload'ining ~31% shu edi.
//
// Endi ikki qavat:
// - BASE_NAMESPACES — root layout'dagi client komponentlar (header, footer, cookie banner,
//   xato sahifasi). Har sahifada bor.
// - ROUTE_NAMESPACES — sahifa yoki bo'lim o'z subtree'si uchun `<IntlScope>` bilan beradi.
//   next-intl ichma-ich provider'larni BIRLASHTIRMAYDI: ichkisi tashqisini almashtiradi,
//   shuning uchun scope o'z subtree'sidagi client komponentlarga kerak bo'lgan HAMMA
//   bo'limlarni sanaydi (root'dagilarini emas — header/footer tashqarida qoladi).
//
// Server komponentlar `getTranslations()` bilan to'liq lug'atni o'qiyveradi — bu ro'yxatlar
// faqat client komponentlar (`'use client'` + `useTranslations`) uchun.
// `client-messages.test.ts` import grafini yurib, har route'da kerakli bo'lim borligini
// tekshiradi — yangi client komponent qo'shsangiz, test qaysi ro'yxatga qo'shishni aytadi.

import type { AbstractIntlMessages } from 'next-intl';

export const BASE_NAMESPACES = [
  'categories',
  'common',
  'cookieBanner',
  'errorPage',
  'footer',
  'localeSwitcher',
  'nav',
  'search',
  'utilityBar',
] as const;

export const ROUTE_NAMESPACES = {
  home: ['product', 'sale'],
  catalog: ['product'],
  brand: ['product'],
  sale: ['product'],
  global: ['common', 'global', 'product'],
  cart: ['cart'],
  checkout: ['checkout', 'regions'],
  groupBuy: ['groupBuy'],
  auth: ['auth'],
  product: ['common', 'product', 'reviews'],
  orders: ['common', 'handover', 'order', 'orderSuccess', 'tracking'],
  // Profil sahifalari maxfiy va kam ochiladi — bo'limlar bitta scope'da (layout).
  profile: [
    'cart',
    'checkout',
    'common',
    'global',
    'handover',
    'loyalty',
    'order',
    'orderSuccess',
    'product',
    'profile',
    'regions',
    'reviews',
    'wishlist',
  ],
} as const satisfies Record<string, readonly string[]>;

export type RouteScope = keyof typeof ROUTE_NAMESPACES;

/** Lug'atdan faqat berilgan bo'limlarni oladi. */
export function pickMessages(
  messages: AbstractIntlMessages,
  namespaces: readonly string[],
): AbstractIntlMessages {
  const out: AbstractIntlMessages = {};
  for (const ns of namespaces) {
    const value = messages[ns];
    if (value !== undefined) out[ns] = value;
  }
  return out;
}
