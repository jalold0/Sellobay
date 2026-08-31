// Katalog — mahsulotlar ro'yxati/detali + ApiProduct→MockProduct adapter.
// DB xatosida dev rejimda mock fallback (ilova hech qachon yiqilmaydi).

import { isRealProductImageUrl, picsumSeed } from '@ecom/utils';

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
    inStock: true,
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

/** Mahsulotlar ro'yxati — DB'dan, dev'da xato bo'lsa mock fallback. */
export async function fetchProducts(params: FetchProductsParams = {}): Promise<MockProduct[]> {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.brand) qs.set('brand', params.brand);
  if (params.q) qs.set('q', params.q);
  if (params.sort) qs.set('sort', params.sort);
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
  // Global demo katalogi (slug 'g-') — API'da yo'q, to'g'ridan-to'g'ri mock'dan
  const global = globalProducts.find((p) => p.slug === slug);
  if (global) return global;
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
