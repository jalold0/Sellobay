// Katalog — mahsulotlar ro'yxati/detali + ApiProduct→MockProduct adapter.
// DB xatosida dev rejimda mock fallback (ilova hech qachon yiqilmaydi).

import { isRealProductImageUrl, onlyUuids, picsumSeed } from '@ecom/utils';

import {
  globalProducts,
  products as mockProducts,
  type MockProduct,
  type LocalizedText,
} from '../mock-data';
import { getJson } from './core';

interface ApiProduct {
  id: string;
  slug: string;
  sku: string;
  name: LocalizedText;
  price: string; // Decimal → string
  oldPrice: string | null;
  currency: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  isFeatured: boolean;
  brand: { id: string; slug: string; name: string } | null;
  imageUrl: string | null;
  category: { slug: string; name: LocalizedText } | null;
  /** Ombordagi umumiy zaxira (variantlar yig'indisi). Server hisoblab beradi. */
  stock?: number;
  inStock?: boolean;
  /** Faqat mahsulot detalida keladi (/api/products/[slug]). */
  variants?: Array<{
    id: string;
    sku: string;
    price: string;
    color: string | null;
    size: string | null;
    stock: number;
    inStock: boolean;
  }>;
}

interface ProductsResponse {
  items: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── ApiProduct → MockProduct adapter (ekranlar shu shape'da) ────

function deriveBadge(p: ApiProduct): MockProduct['badge'] {
  if (p.oldPrice) return 'SALE';
  if (p.rating >= 4.7 && p.reviewCount >= 100) return 'TOP';
  if (p.isFeatured) return 'NEW';
  return undefined;
}

function toMockProduct(p: ApiProduct): MockProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand?.name ?? 'Sellobay',
    brandId: p.brand?.slug ?? '',
    categoryId: p.category?.slug ?? '',
    price: Number(p.price) || 0,
    oldPrice: p.oldPrice ? Number(p.oldPrice) || 0 : undefined,
    currency: 'UZS',
    rating: p.rating,
    reviewCount: p.reviewCount,
    imageSeed: picsumSeed(p.imageUrl) ?? p.slug,
    // Sotuvchi yuklagan haqiqiy rasm — ilgari mobil uni umuman uzatmasdi,
    // shu sababli telefonda faqat seed rasmlari ko'rinardi.
    imageUrl: isRealProductImageUrl(p.imageUrl) ? (p.imageUrl ?? undefined) : undefined,
    badge: deriveBadge(p),
    // Serverning HAQIQIY zaxira holati. Ilgari bu yerda `inStock: true` qotib
    // yozilgan edi — omborda tugagan tovar mobilda "sotuvda bor" ko'rinardi,
    // savatga qo'shilardi va checkout'da STOCK_INSUFFICIENT bilan yiqilardi.
    // Server maydonni bermasa (eski javob) — savdoni to'xtatib qo'ymaslik
    // uchun `true` deb qabul qilamiz, lekin bergan qiymatini hech qachon
    // e'tiborsiz qoldirmaymiz.
    inStock: p.inStock ?? true,
    // Sotuv soni ham tashlab yuborilardi — "Eng ko'p sotilgan" bloki shu
    // maydonga tayanadi.
    soldCount: p.soldCount,
    // Variantlar faqat mahsulot detalida keladi.
    variants: p.variants?.map((v) => ({
      id: v.id,
      sku: v.sku,
      price: Number(v.price) || 0,
      color: v.color,
      size: v.size,
      stock: v.stock,
      inStock: v.inStock,
    })),
  };
}

export interface FetchProductsParams {
  category?: string;
  brand?: string;
  q?: string;
  sort?: string;
  featured?: boolean;
  limit?: number;
}

/**
 * Mobil UI saralash nomlarini SERVER kutgan nomlarga o'giradi.
 *
 * Mobil ekranda kalit `popularity`, server esa `popular` ni biladi va
 * tanimagan qiymatni jimgina `publishedAt desc` (eng yangi) deb qabul
 * qiladi. Ya'ni "Ommabop" tanlaganda server eng yangilarni qaytarardi —
 * xato ko'rinmasdi, chunki mobil keyin ro'yxatni o'zi ham saralaydi;
 * lekin qaysi 48 mahsulot kelishi noto'g'ri edi.
 */
const SORT_TO_API: Record<string, string> = {
  popularity: 'popular',
  'price-asc': 'price-asc',
  'price-desc': 'price-desc',
  rating: 'rating',
  newest: 'newest',
};

/** Mahsulotlar ro'yxati — DB'dan, dev'da xato bo'lsa mock fallback. */
export async function fetchProducts(params: FetchProductsParams = {}): Promise<MockProduct[]> {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.brand) qs.set('brand', params.brand);
  if (params.q) qs.set('q', params.q);
  if (params.sort) qs.set('sort', SORT_TO_API[params.sort] ?? params.sort);
  if (params.featured) qs.set('featured', 'true');
  qs.set('limit', String(params.limit ?? 48));

  try {
    const data = await getJson<ProductsResponse>(`/api/products?${qs.toString()}`);
    if (!data.items?.length) {
      if (__DEV__) return filterMock(params);
      return [];
    }
    return data.items.map(toMockProduct);
  } catch (err) {
    if (__DEV__) {
      console.warn('[api] fetchProducts fallback → mock:', String(err));
      return filterMock(params);
    }
    throw err;
  }
}

/** Bitta mahsulot — slug bo'yicha. */
export async function fetchProduct(slug: string): Promise<MockProduct | null> {
  // Global demo katalogi (slug 'g-') — FAQAT dev. Ilgari bu qator prod'da ham
  // ishlagan: mijoz 'g-' havolasini ochsa to'qima mahsulot (soxta narx, reyting,
  // sotilgan soni) ko'rsatilardi va uning id'si UUID emasligi uchun savatga
  // qo'shilgan tovar checkout'da rad etilardi.
  if (__DEV__) {
    const global = globalProducts.find((p) => p.slug === slug);
    if (global) return global;
  }
  try {
    const p = await getJson<ApiProduct & { description?: LocalizedText }>(`/api/products/${slug}`);
    return toMockProduct(p);
  } catch (err) {
    if (__DEV__) {
      console.warn('[api] fetchProduct fallback → mock:', String(err));
      return mockProducts.find((p) => p.slug === slug) ?? null;
    }
    throw err;
  }
}

// ─── Mock fallback (DB'siz rejim) ────────────────────────────────

function filterMock(params: FetchProductsParams): MockProduct[] {
  let list = mockProducts.slice();
  if (params.featured) list = list.filter((p) => p.badge === 'TOP' || p.badge === 'SALE');
  if (params.q) {
    const q = params.q.toLowerCase();
    list = list.filter(
      (p) =>
        Object.values(p.name).some((n) => n.toLowerCase().includes(q)) ||
        p.brand.toLowerCase().includes(q),
    );
  }
  switch (params.sort) {
    case 'price-asc':
      list.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      list.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      list.sort((a, b) => b.rating - a.rating);
      break;
    default:
      list.sort((a, b) => b.reviewCount - a.reviewCount);
  }
  return list.slice(0, params.limit ?? 48);
}

/**
 * Aniq ID'lar bo'yicha mahsulotlar.
 *
 * Sevimlilar va savat sinxroni uchun kerak. Ilgari sevimlilar ekrani birinchi
 * 48 mahsulot ro'yxatidan filtrlardi — o'sha 48 talikka kirmagan sevimli
 * mahsulot ekranda KO'RINMASDI (ro'yxat esa bo'sh emasdek turardi, chunki
 * sanoq boshqa joydan olinardi). Server `?ids=` filtrini allaqachon
 * qo'llab-quvvatlaydi.
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
      const data = await getJson<ProductsResponse>(
        `/api/products?ids=${chunk.join(',')}&limit=${chunk.length}`,
      );
      out.push(...(data.items ?? []).map(toMockProduct));
    } catch (err) {
      // Bir bo'lak kelmasa qolganini baribir qaytaramiz — ro'yxat butunlay
      // bo'sh chiqib ketmasin.
      console.warn('[api] fetchProductsByIds xato:', String(err));
    }
  }

  return out;
}
