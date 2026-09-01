// Sellobay — Server-side catalog data layer
// DB (Neon PostgreSQL, Prisma) dan o'qiydi va frontend komponentlar kutadigan
// MockProduct shape'iga moslaydi. DB ishlamasa (env yo'q, network) — mock fallback.
// Faqat Server Component'lardan chaqiriladi.
//
// Optimizatsiya (Sprint 3):
//  • relationLoadStrategy: 'join' — brand/images/categories bitta LATERAL JOIN'da
//    yuklanadi (avval har biri alohida IN-query edi — N+1 pattern).
//  • unstable_cache — bir xil so'rov 120s ichida DB'ga qayta urmaydi (Neon
//    serverless cold-start va connection overhead'ini tejaydi). 'products' tag
//    orqali invalidatsiya qilinadi (mahsulot o'zgarsa revalidateTag('products')).

import { isRealProductImageUrl, picsumSeed } from '@ecom/utils';
import { unstable_cache } from 'next/cache';

import { prisma } from './db';
import { products as mockProducts, type LocalizedText, type MockProduct } from './mock-data';

export const CATALOG_CACHE_TAG = 'products';
const CATALOG_REVALIDATE_SECONDS = 120;

// Mock/demo mahsulotlar (p1..p12) faqat DEV fallback uchun — ular UUID emas va
// slug'lari DB'dan farq qiladi. Production'da ularni ko'rsatish checkout'da
// "Invalid uuid" va mahsulot sahifasida soxta 404 keltiradi. Shuning uchun
// production'da mock BERILMAYDI: bo'sh DB → bo'sh ro'yxat, DB xatosi → yuqoriga
// (error boundary retry), soxta ma'lumot emas.
const ALLOW_MOCK_FALLBACK = process.env.NODE_ENV !== 'production';

// ─── DB → MockProduct mapping ────────────────────────────────────

interface DbProductRow {
  id: string;
  slug: string;
  name: unknown;
  basePrice: { toString(): string };
  compareAtPrice: { toString(): string } | null;
  currency: string;
  rating: { toString(): string };
  reviewCount: number;
  soldCount: number;
  isFeatured: boolean;
  publishedAt: Date | null;
  brand: { slug: string; name: string } | null;
  images: { url: string }[];
  categories: { category: { slug: string } }[];
  // Ombor: mahsulot zaxirasi = varyantlari inventarining yig'indisi (admin/seller ham shunday)
  variants: { inventory: { quantityOnHand: number }[] }[];
  // Sotuvchi — verified chip uchun (null = platform-rasmiy mahsulot)
  seller: { status: string } | null;
  // Global (Xitoy) manbasi bor bo'lsa — bu global tovar
  globalSource: { id: string } | null;
}

function deriveBadge(p: DbProductRow): MockProduct['badge'] {
  if (p.compareAtPrice) return 'SALE';
  if (Number(p.rating) >= 4.7 && p.reviewCount >= 100) return 'TOP';
  if (p.publishedAt && Date.now() - p.publishedAt.getTime() < 14 * 86_400_000) return 'NEW';
  return undefined;
}

function toMockProduct(p: DbProductRow): MockProduct {
  const imageUrl = p.images[0]?.url ?? '';
  // Zaxira = barcha varyantlar inventarining yig'indisi. 0 bo'lsa "omborda yo'q".
  const stock = p.variants.reduce(
    (sum, v) => sum + v.inventory.reduce((s, inv) => s + inv.quantityOnHand, 0),
    0,
  );
  return {
    id: p.id,
    slug: p.slug,
    name: p.name as LocalizedText,
    brand: p.brand?.name ?? 'Sellobay',
    brandId: p.brand?.slug ?? '',
    categoryId: p.categories[0]?.category.slug ?? '',
    price: Number(p.basePrice),
    oldPrice: p.compareAtPrice ? Number(p.compareAtPrice) : undefined,
    currency: 'UZS',
    rating: Number(p.rating),
    reviewCount: p.reviewCount,
    imageSeed: picsumSeed(imageUrl) ?? p.slug,
    // Haqiqiy rasm URL (seed qoldig'i bo'lmasa) — komponentlar shuni ishlatadi.
    imageUrl: isRealProductImageUrl(imageUrl) ? imageUrl : undefined,
    badge: deriveBadge(p),
    inStock: stock > 0,
    // Verified: seller yo'q (platform-rasmiy) yoki seller ACTIVE holatda
    sellerVerified: !p.seller || p.seller.status === 'ACTIVE',
    isGlobal: p.globalSource !== null,
  };
}

const PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  basePrice: true,
  compareAtPrice: true,
  currency: true,
  rating: true,
  reviewCount: true,
  soldCount: true,
  isFeatured: true,
  publishedAt: true,
  brand: { select: { slug: true, name: true } },
  images: { select: { url: true }, orderBy: { position: 'asc' as const }, take: 1 },
  categories: { select: { category: { select: { slug: true } } }, take: 1 },
  variants: { select: { inventory: { select: { quantityOnHand: true } } } },
  seller: { select: { status: true } },
  globalSource: { select: { id: true } },
} as const;

// ─── Public API ──────────────────────────────────────────────────

/**
 * Katalog qamrovi. LOKAL va GLOBAL tovarlar bitta `Product` jadvalida yashaydi
 * (`globalSource` yozuvi bor/yo'qligi bilan farqlanadi), shuning uchun HAR BIR
 * ro'yxat so'rovi qamrovni aniq belgilashi kerak — aks holda 15-17 kunlik Xitoy
 * tovari 1-2 kunlik lokal tovarlar orasiga tushib qoladi.
 */
export type CatalogScope = 'LOCAL' | 'GLOBAL' | 'ALL';

export interface CatalogQuery {
  category?: string; // category slug
  brand?: string; // brand slug
  q?: string; // qidiruv matni
  sort?: string; // popularity | price-asc | price-desc | rating | newest
  limit?: number;
  /** Standart LOCAL — global tovar tasodifan lokal katalogga chiqmasin. */
  scope?: CatalogScope;
}

/** Qamrovni Prisma `where` shartiga aylantiradi. */
export function scopeWhere(scope: CatalogScope = 'LOCAL'): Record<string, unknown> {
  if (scope === 'GLOBAL') return { globalSource: { isNot: null } };
  if (scope === 'ALL') return {};
  return { globalSource: { is: null } };
}

/** DB'dan o'qish — kesh ichida ishlaydi (chaqiruvchi to'g'ridan-to'g'ri chaqirmaydi). */
async function queryProductsFromDb(query: CatalogQuery): Promise<{
  items: MockProduct[];
  source: 'db' | 'mock';
}> {
  const { category, brand, q, sort, limit = 48, scope = 'LOCAL' } = query;

  try {
    const where: Record<string, unknown> = {
      status: 'ACTIVE',
      deletedAt: null,
      ...scopeWhere(scope),
    };
    if (brand) where.brand = { slug: brand };
    if (category) where.categories = { some: { category: { slug: category } } };
    if (q) {
      // JSON string_contains katta-kichik harfga sezgir — bosh-harfli variantni ham sinaymiz
      const qCap = q.charAt(0).toUpperCase() + q.slice(1);
      where.OR = [
        { slug: { contains: q.toLowerCase() } },
        { brand: { name: { contains: q, mode: 'insensitive' } } },
        { name: { path: ['uz'], string_contains: q } },
        { name: { path: ['ru'], string_contains: q } },
        { name: { path: ['en'], string_contains: q } },
        ...(qCap !== q
          ? [
              { name: { path: ['uz'], string_contains: qCap } },
              { name: { path: ['ru'], string_contains: qCap } },
              { name: { path: ['en'], string_contains: qCap } },
            ]
          : []),
      ];
    }

    const orderBy =
      sort === 'price-asc'
        ? { basePrice: 'asc' as const }
        : sort === 'price-desc'
          ? { basePrice: 'desc' as const }
          : sort === 'rating'
            ? { rating: 'desc' as const }
            : sort === 'newest'
              ? { publishedAt: 'desc' as const }
              : { soldCount: 'desc' as const }; // default: popularity

    const rows = await prisma.product.findMany({
      where,
      orderBy,
      take: limit,
      select: PRODUCT_SELECT,
      // Brand/images/categories'ni bitta LATERAL JOIN'da yuklash (N+1 ni yo'qotadi)
      relationLoadStrategy: 'join',
    });

    // Filtersiz so'rov bo'sh qaytsa — DB hali seed qilinmagan. DEV'da mock ko'rsatamiz,
    // production'da bo'sh ro'yxat (soxta, sotib bo'lmaydigan mahsulotlar emas).
    if (rows.length === 0 && !category && !brand && !q && scope !== 'GLOBAL') {
      return ALLOW_MOCK_FALLBACK
        ? { items: filterMock(query), source: 'mock' }
        : { items: [], source: 'db' };
    }

    return { items: rows.map(toMockProduct), source: 'db' };
  } catch (err) {
    console.error('[catalog] DB xato:', err);
    // DEV'da mock fallback qulay; production'da xatoni yuqoriga uzatamiz (error
    // boundary retry ko'rsatadi) — soxta mock ko'rsatib checkout'ni buzmaymiz.
    if (ALLOW_MOCK_FALLBACK) return { items: filterMock(query), source: 'mock' };
    throw err;
  }
}

// Keshlangan o'rama — bir xil query 120s ichida DB'ga qayta urmaydi.
// unstable_cache argumentlarni avtomatik kalit qiladi (query obyekti serializatsiya bo'ladi).
const cachedQueryProducts = unstable_cache(queryProductsFromDb, ['catalog-products-v1'], {
  revalidate: CATALOG_REVALIDATE_SECONDS,
  tags: [CATALOG_CACHE_TAG],
});

/** Katalog mahsulotlari — keshlangan DB o'qish, xato bo'lsa mock fallback. */
export async function fetchProducts(query: CatalogQuery = {}): Promise<{
  items: MockProduct[];
  source: 'db' | 'mock';
}> {
  return cachedQueryProducts(query);
}

/**
 * Bitta mahsulot (slug bo'yicha) — DB'dan real ma'lumot + zaxira (inStock). Topilmasa null.
 * Mahsulot detali sahifasi uchun: real DB UUID/slug/narx/zaxira qaytaradi (mock EMAS),
 * shunda "Savatga qo'shish" to'g'ri UUID beradi va checkout ishlaydi. Keshsiz — zaxira
 * yangiroq bo'lsin (oversell'ning avtoritar himoyasi baribir checkout'da).
 */
export async function fetchProductBySlug(slug: string): Promise<MockProduct | null> {
  try {
    const row = await prisma.product.findFirst({
      where: { slug, status: 'ACTIVE', deletedAt: null },
      select: PRODUCT_SELECT,
    });
    return row ? toMockProduct(row) : null;
  } catch (err) {
    console.error('[catalog] fetchProductBySlug DB xato:', err);
    // MUHIM: DB xatosini "topilmadi" (null → 404) ga aylantirmaymiz. Aks holda
    // transient Neon xatosida real mahsulot uchun ham soxta 404 chiqadi ("bazida").
    // DEV'da null qaytaramiz (mock fallback ishlasin); production'da xatoni uzatamiz.
    if (ALLOW_MOCK_FALLBACK) return null;
    throw err;
  }
}

/**
 * Detal sahifasi uchun BAZADAGI haqiqiy qo'shimchalar.
 *
 * Bu tuzilma o'sib borishi kerak, kamayishi emas: sahifa qancha ko'p maydonni
 * bazadan olsa, shuncha kam narsa to'qib chiqariladi.
 */
export interface ProductDetailExtras {
  galleryUrls: string[]; // haqiqiy rasm URL'lari (placeholder emas), position tartibida
  colors: string[]; // variantlardagi noyob ranglar
  sizes: { label: string; inStock: boolean }[]; // variantlardagi noyob o'lchamlar
  sku: string; // haqiqiy SKU (ilgari `ECM-<id>` deb to'qib chiqarilardi)
  weightGrams: number | null;
  description: LocalizedText | null; // sotuvchi yozgan tavsif
  reviews: DbProductReview[]; // tasdiqlangan sharhlar (bo'lmasa bo'sh)
}

/** Bazadagi sharh — interfeys uchun tayyorlangan ko'rinish. */
export interface DbProductReview {
  id: string;
  author: string;
  rating: number;
  title?: string;
  body: string;
  createdAt: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
}

/**
 * Sharh muallifi: ism + familiya bosh harfi ("Akmal K.").
 * To'liq familiya ko'rsatilmaydi — sharh ochiq sahifada turadi.
 */
function reviewAuthorName(user: { firstName: string | null; lastName: string | null }): string {
  const first = user.firstName?.trim();
  const lastInitial = user.lastName?.trim()?.[0];
  if (!first) return 'Mijoz';
  return lastInitial ? `${first} ${lastInitial}.` : first;
}

export async function fetchProductDetailExtras(slug: string): Promise<ProductDetailExtras | null> {
  try {
    const row = await prisma.product.findFirst({
      where: { slug, status: 'ACTIVE', deletedAt: null },
      select: {
        sku: true,
        weightGrams: true,
        description: true,
        images: { select: { url: true }, orderBy: { position: 'asc' } },
        // Faqat TASDIQLANGAN sharhlar. Sharh yo'q bo'lsa ro'yxat bo'sh qoladi —
        // ilgari bu yerda sharhlar to'qib chiqarilardi (soxta ism va matn bilan).
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            rating: true,
            title: true,
            body: true,
            createdAt: true,
            isVerifiedPurchase: true,
            helpfulCount: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        variants: {
          where: { isActive: true },
          orderBy: { position: 'asc' },
          select: {
            inventory: { select: { quantityOnHand: true } },
            attributes: {
              select: { valueString: true, attribute: { select: { slug: true } } },
            },
          },
        },
      },
    });
    if (!row) return null;

    // Faqat haqiqiy rasm manzillari (seed qoldiqlari emas)
    const galleryUrls = row.images.map((i) => i.url).filter(isRealProductImageUrl);

    const colors: string[] = [];
    const sizeMap = new Map<string, boolean>();
    for (const v of row.variants) {
      const inStock = v.inventory.reduce((s, inv) => s + inv.quantityOnHand, 0) > 0;
      for (const a of v.attributes) {
        if (!a.valueString) continue;
        if (a.attribute.slug === 'color' && !colors.includes(a.valueString)) {
          colors.push(a.valueString);
        }
        if (a.attribute.slug === 'size') {
          sizeMap.set(a.valueString, (sizeMap.get(a.valueString) ?? false) || inStock);
        }
      }
    }
    return {
      galleryUrls,
      colors,
      sizes: Array.from(sizeMap.entries()).map(([label, inStock]) => ({ label, inStock })),
      sku: row.sku,
      weightGrams: row.weightGrams,
      description: (row.description as LocalizedText | null) ?? null,
      reviews: row.reviews.map((review) => ({
        id: review.id,
        author: reviewAuthorName(review.user),
        rating: review.rating,
        title: review.title ?? undefined,
        body: review.body ?? '',
        createdAt: review.createdAt.toISOString(),
        verifiedPurchase: review.isVerifiedPurchase,
        helpfulCount: review.helpfulCount,
      })),
    };
  } catch (err) {
    console.error('[catalog] fetchProductDetailExtras DB xato:', err);
    return null;
  }
}

/** Bosh sahifa data — bitta so'rovda hero/featured/sale bo'limlari uchun. */
export async function fetchHomeProducts(): Promise<{
  hero: MockProduct[];
  featured: MockProduct[];
  collection: MockProduct[];
  sale: MockProduct[];
  source: 'db' | 'mock';
}> {
  const { items, source } = await fetchProducts({ sort: 'popularity', limit: 24 });
  const sale = items.filter((p) => p.badge === 'SALE' || p.badge === 'TOP').slice(0, 8);
  return {
    hero: items.slice(0, 3),
    featured: items.slice(0, 8),
    collection: items.slice(3, 6),
    sale: sale.length >= 4 ? sale : items.slice(0, 8),
    source,
  };
}

// ─── Mock fallback filtering (DB'siz rejim) ──────────────────────

function filterMock(query: CatalogQuery): MockProduct[] {
  let list = mockProducts.slice();
  if (query.q) {
    const q = query.q.toLowerCase();
    list = list.filter(
      (p) =>
        Object.values(p.name).some((n) => n.toLowerCase().includes(q)) ||
        p.brand.toLowerCase().includes(q),
    );
  }
  switch (query.sort) {
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
  return list.slice(0, query.limit ?? 48);
}
