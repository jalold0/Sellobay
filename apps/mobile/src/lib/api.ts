// Sellobay mobil — jonli API client
// Web bilan BIR XIL backend: sellobay-web.vercel.app/api (Neon PostgreSQL)
// Internet/DB muammosi bo'lsa — mock fallback (ilova hech qachon yiqilmaydi).

import Constants from 'expo-constants';

import { products as mockProducts, type MockProduct, type LocalizedText } from './mock-data';

const API_BASE =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'https://sellobay-web.vercel.app';

// ─── API javob turlari ───────────────────────────────────────────

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

const PICSUM_SEED_RE = /picsum\.photos\/seed\/([^/]+)\//;

function deriveBadge(p: ApiProduct): MockProduct['badge'] {
  if (p.oldPrice) return 'SALE';
  if (p.rating >= 4.7 && p.reviewCount >= 100) return 'TOP';
  if (p.isFeatured) return 'NEW';
  return undefined;
}

function toMockProduct(p: ApiProduct): MockProduct {
  const seedMatch = p.imageUrl ? PICSUM_SEED_RE.exec(p.imageUrl) : null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand?.name ?? 'Sellobay',
    brandId: p.brand?.slug ?? '',
    categoryId: p.category?.slug ?? '',
    price: Number(p.price),
    oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
    currency: 'UZS',
    rating: p.rating,
    reviewCount: p.reviewCount,
    imageSeed: seedMatch?.[1] ?? p.slug,
    badge: deriveBadge(p),
    inStock: true,
  };
}

// ─── Public API funksiyalari ─────────────────────────────────────

export interface FetchProductsParams {
  category?: string;
  brand?: string;
  q?: string;
  sort?: string;
  featured?: boolean;
  limit?: number;
}

const TIMEOUT_MS = 12_000;

async function getJson<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Mahsulotlar ro'yxati — DB'dan, xato bo'lsa mock fallback. */
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
    if (!data.items?.length) return filterMock(params);
    return data.items.map(toMockProduct);
  } catch (err) {
    console.warn('[api] fetchProducts fallback → mock:', String(err));
    return filterMock(params);
  }
}

/** Bitta mahsulot — slug bo'yicha. */
export async function fetchProduct(slug: string): Promise<MockProduct | null> {
  try {
    const p = await getJson<ApiProduct & { description?: LocalizedText }>(`/api/products/${slug}`);
    return toMockProduct(p);
  } catch (err) {
    console.warn('[api] fetchProduct fallback → mock:', String(err));
    return mockProducts.find((p) => p.slug === slug) ?? null;
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

export { API_BASE };
