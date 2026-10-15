import { routing } from '../i18n/routing';

/** Qidiruvda chiqmasligi kerak bo'lgan bo'limlar (til prefiksisiz). */
const PRIVATE_SECTIONS = ['/profile', '/cart', '/checkout', '/orders'];

/**
 * robots.txt dagi `Disallow` yo'llari.
 *
 * Har bir URL til prefiksi bilan boshlanadi (`localePrefix: 'always'`): `/uz/cart`.
 * Ilgari qoidalar prefiksiz yozilgan edi (`/cart`) va hech bir haqiqiy manzilga mos
 * kelmasdi (audit SEO-01). Endi har bir til uchun alohida yoziladi; sahifalarning
 * o'zida ham `noindex` bor (PRIVATE_PAGE_ROBOTS).
 */
export function privateDisallowPaths(locales: readonly string[] = routing.locales): string[] {
  return ['/api/', ...locales.flatMap((l) => PRIVATE_SECTIONS.map((s) => `/${l}${s}`))];
}
