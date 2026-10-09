// Klient tomonidagi `/api/products` adapteri.
//
// Ilgari `ApiProduct` interfeysi va uni `MockProduct`ga o'giruvchi funksiya
// sevimlilar sahifasi ICHIDA yozilgan edi. Endi savat sinxroni ham shu
// ma'lumotga muhtoj (boshqa qurilmadan kelgan satrni tiklash uchun nom,
// brend, rasm kerak), shuning uchun umumiy modulga chiqarildi — uchinchi
// nusxa yaratmaslik uchun.

import { isRealProductImageUrl, onlyUuids, picsumSeed } from '@ecom/utils';

import { type MockProduct } from './mock-data';

export interface ApiProduct {
  id: string;
  slug: string;
  name: { uz?: string; ru?: string; en?: string } | string;
  price: string;
  oldPrice: string | null;
  currency: string;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  brand: { id: string; slug: string; name: string } | null;
  imageUrl: string | null;
  category: { slug: string; name: { uz?: string; ru?: string; en?: string } | string } | null;
  /** Server hisoblab beradigan haqiqiy zaxira holati. */
  inStock?: boolean;
}

export function toMockProduct(p: ApiProduct): MockProduct {
  return {
    id: p.id,
    slug: p.slug,
    name:
      typeof p.name === 'string'
        ? { uz: p.name, ru: p.name, en: p.name }
        : (p.name as MockProduct['name']),
    brand: p.brand?.name ?? 'Sellobay',
    brandId: p.brand?.slug ?? '',
    categoryId: p.category?.slug ?? '',
    price: Number(p.price),
    oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
    currency: 'UZS',
    rating: p.rating,
    reviewCount: p.reviewCount,
    imageSeed: picsumSeed(p.imageUrl) ?? p.slug,
    imageUrl: isRealProductImageUrl(p.imageUrl) ? (p.imageUrl ?? undefined) : undefined,
    badge: p.oldPrice ? 'SALE' : p.isFeatured ? 'TOP' : undefined,
    // Ilgari bu yerda `true` qotib yozilgan edi — omborda tugagan tovar
    // sevimlilar ro'yxatida "sotuvda bor" ko'rinardi. Server maydonni
    // bermasa savdoni to'xtatib qo'ymaymiz, lekin bergan qiymatini
    // e'tiborsiz ham qoldirmaymiz (mobil adapterda ham shunday).
    inStock: p.inStock ?? true,
  };
}

/**
 * Aniq ID'lar bo'yicha mahsulotlar.
 *
 * Server `?ids=` filtrini qo'llab-quvvatlaydi va aniq ID so'ralganda qamrov
 * (lokal/global) filtri qo'llanmaydi, ya'ni global tovar ham qaytadi.
 */
export async function fetchProductsByIds(ids: readonly string[]): Promise<MockProduct[]> {
  const unique = onlyUuids(ids);
  if (unique.length === 0) return [];

  // Server bir so'rovda 100 tagacha beradi — kattaroq ro'yxatni bo'lib so'raymiz.
  const CHUNK = 50;
  const out: MockProduct[] = [];

  for (let i = 0; i < unique.length; i += CHUNK) {
    const chunk = unique.slice(i, i + CHUNK);
    try {
      const res = await fetch(`/api/products?ids=${chunk.join(',')}&limit=${chunk.length}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { success: boolean; data?: { items?: ApiProduct[] } };
      if (!json.success) continue;
      out.push(...(json.data?.items ?? []).map(toMockProduct));
    } catch {
      // Bir bo'lak kelmasa qolganini baribir qaytaramiz.
    }
  }

  return out;
}
