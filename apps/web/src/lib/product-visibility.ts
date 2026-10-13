// Vitrinada (katalog, qidiruv, savat, checkout) qaysi tovar ko'rinadi.
//
// Tovar statusidan tashqari SOTUVCHI ham faol bo'lishi shart (audit Y2): ilgari seller
// bloklansa ham tovarlari sotuvda qolardi — bloklash faqat «tasdiqlangan» belgisini olardi.
// Sotuvchisiz (platformaning o'z) tovarlari ko'rinadi.
//
// `NOT` kaliti ataylab: so'rovlar `OR` ni qidiruv uchun o'zi ishlatadi, ustiga yozilmasin.

import type { Prisma } from '@ecom/database';

/** Sotuvchisi faol (yoki sotuvchisiz) — savat va checkout shu bilan tekshiradi. */
export const SELLER_IS_ACTIVE = {
  NOT: { seller: { status: { not: 'ACTIVE' } } },
} as const satisfies Prisma.ProductWhereInput;

/**
 * Ommaviy katalog (ro'yxat, qidiruv, tovar sahifasi, sevimlilar, guruh xaridi): yuqoridagi
 * shart + mijozning narx taklifidan yaratilgan SHAXSIY global tovar ko'rinmaydi (ADR 0015).
 * Uni faqat egasi to'lov sahifasida sotib oladi — buni `orders-server` tekshiradi.
 */
export const PUBLIC_CATALOG = {
  NOT: [
    { seller: { status: { not: 'ACTIVE' } } },
    { globalSource: { is: { sourcingRequestId: { not: null } } } },
  ],
} as const satisfies Prisma.ProductWhereInput;
