import type { MockProduct } from './mock-data';

/**
 * Haqiqiy chegirmadagi mahsulotlar: eski narx joriy narxdan katta.
 *
 * Bosh sahifadagi «Aksiya» bo'limi FAQAT shulardan quriladi. Ilgari chegirmasiz `TOP` va
 * oddiy mashhur mahsulotlar ham qo'shilar, kartochkada esa `price * 1.3` dan o'ylab
 * topilgan «−23%» chiqardi (audit TRU-02) — bu noto'g'ri reklama.
 */
export function discountedProducts(items: MockProduct[], limit = 8): MockProduct[] {
  return items.filter((p) => p.oldPrice != null && p.oldPrice > p.price).slice(0, limit);
}
