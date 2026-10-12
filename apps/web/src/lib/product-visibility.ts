// Vitrinada (katalog, qidiruv, savat, checkout) qaysi tovar ko'rinadi.
//
// Tovar statusidan tashqari SOTUVCHI ham faol bo'lishi shart (audit Y2): ilgari seller
// bloklansa ham tovarlari sotuvda qolardi — bloklash faqat «tasdiqlangan» belgisini olardi.
// Sotuvchisiz (platformaning o'z) tovarlari ko'rinadi.
//
// `NOT` kaliti ataylab: so'rovlar `OR` ni qidiruv uchun o'zi ishlatadi, ustiga yozilmasin.

import type { Prisma } from '@ecom/database';

export const SELLER_IS_ACTIVE = {
  NOT: { seller: { status: { not: 'ACTIVE' } } },
} as const satisfies Prisma.ProductWhereInput;
