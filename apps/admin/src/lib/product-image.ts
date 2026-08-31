// Admin panelida ko'rsatiladigan mahsulot rasmi manzili.
//
// Admin web ilovadan BOSHQA domenda ishlaydi, shuning uchun `/products/x.jpg`
// kabi nisbiy yo'l bu yerda ishlamaydi — u admin domeniga urinadi va 404 beradi.
// Manzil shu sababli absolut qilinadi.
//
// Fallback mobil ilovadagi bilan bir xil qiymat (apps/mobile/src/lib/api/core.ts).

import { resolveProductImageUrl } from '@ecom/utils';

const WEB_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://sellobay-web.vercel.app';

/** Bazadagi rasm manzilini admin panelida ko'rsatishga tayyor holga keltiradi. */
export function adminProductImage(dbUrl: string | null | undefined, slug: string): string {
  return resolveProductImageUrl(dbUrl, slug, WEB_URL);
}
