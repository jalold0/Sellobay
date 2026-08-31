// Mahsulot detali uchun kengaytirilgan mock — kelajakda backend'dan keladi.
// `mock-data.ts` minimal modelni ushlab turadi, bu yer "rich" view modelni qo'shadi.

import { findById, type LocalizedText, type MockProduct, products } from './mock-data';

export interface ProductGalleryImage {
  seed: string;
  /** Haqiqiy rasm URL (DB'dan). Bo'lsa seed placeholder o'rniga shu ko'rsatiladi. */
  url?: string;
  alt?: string;
}

export interface ProductVariantColor {
  id: string;
  label: string;
  hex: string;
}

export interface ProductVariantSize {
  id: string;
  label: string;
  inStock?: boolean;
}

export interface ProductReview {
  id: string;
  author: string;
  /** Avatar uchun kalit — haqiqiy sharhda bo'lmasligi mumkin (bosh harflar ko'rsatiladi). */
  avatarSeed?: string;
  rating: number; // 1..5
  title?: string;
  body: string;
  createdAt: string;
  verifiedPurchase?: boolean;
  helpfulCount?: number;
}

export interface ProductQuestion {
  id: string;
  author: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  createdAt: string;
}

export interface ProductSpec {
  label: LocalizedText;
  value: string;
}

export interface ProductFullDetail {
  product: MockProduct;
  /** Sotuvchi yozgan tavsif. Yo'q bo'lsa null — bo'lim ko'rsatilmaydi. */
  description: LocalizedText | null;
  features: LocalizedText[];
  gallery: ProductGalleryImage[];
  colors: ProductVariantColor[];
  sizes: ProductVariantSize[];
  specs: ProductSpec[];
  reviews: ProductReview[];
  questions: ProductQuestion[];
  ratingBreakdown: Record<1 | 2 | 3 | 4 | 5, number>; // %
}

const FALLBACK_COLORS: ProductVariantColor[] = [
  { id: 'black', label: 'Qora', hex: '#0f172a' },
  { id: 'red', label: 'Qizil', hex: '#ef4444' },
  { id: 'blue', label: "Ko'k", hex: '#3b82f6' },
  { id: 'amber', label: 'Sariq', hex: '#f59e0b' },
];

const FOOTWEAR_SIZES: ProductVariantSize[] = [
  { id: '38', label: '38' },
  { id: '39', label: '39' },
  { id: '40', label: '40' },
  { id: '41', label: '41' },
  { id: '42', label: '42', inStock: false },
  { id: '43', label: '43' },
  { id: '44', label: '44' },
  { id: '45', label: '45', inStock: false },
];

const CLOTHING_SIZES: ProductVariantSize[] = [
  { id: 'XS', label: 'XS' },
  { id: 'S', label: 'S' },
  { id: 'M', label: 'M' },
  { id: 'L', label: 'L' },
  { id: 'XL', label: 'XL' },
  { id: 'XXL', label: 'XXL', inStock: false },
];

/**
 * SHARH, SAVOL VA REYTING TAQSIMOTI ENDI TO'QIB CHIQARILMAYDI.
 *
 * Ilgari bu yerda `buildReviews`, `buildQuestions` va `buildRatingBreakdown`
 * turardi. Ular har bir mahsulot uchun sharh YARATARDI: o'ylab topilgan ism
 * ("Akmal K."), tayyor matn, sana, "tasdiqlangan xarid" belgisi va foydali
 * ovozlar soni. Savollar esa sotuvchi nomidan javob berardi — jumladan
 * "100% asl mahsulot kafolati bilan" degan kafolat, uni hech kim bermagan.
 *
 * Bazada 0 ta sharh bor edi, saytda esa 8 ta mahsulot sharh ko'rsatardi.
 * Mijoz bosib kirsa, hech narsa topmasdi.
 *
 * Endi sharhlar `Review` jadvalidan keladi (catalog.ts). Sharh yo'q bo'lsa
 * ro'yxat bo'sh qoladi va interfeys "hali sharh yo'q" deb yozadi.
 */

/** Haqiqiy sharhlardan reyting taqsimotini (foizda) hisoblaydi. */
function ratingBreakdownFrom(reviews: ProductReview[]): Record<1 | 2 | 3 | 4 | 5, number> {
  const empty = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  if (reviews.length === 0) return empty;
  for (const review of reviews) {
    const star = Math.min(5, Math.max(1, Math.round(review.rating))) as 1 | 2 | 3 | 4 | 5;
    empty[star] += 1;
  }
  for (const star of [1, 2, 3, 4, 5] as const) {
    empty[star] = Math.round((empty[star] / reviews.length) * 100);
  }
  return empty;
}

export function getProductDetail(slugOrId: string): ProductFullDetail | undefined {
  const product = products.find((p) => p.slug === slugOrId || p.id === slugOrId);
  if (!product) return undefined;
  return buildProductDetail(product);
}

/**
 * Bazadan kelgan HAQIQIY qo'shimchalar. Berilsa — sahifa faqat shulardan quriladi.
 *
 * Bu obyekt qancha to'la bo'lsa, sahifada shuncha kam narsa taxmin qilinadi.
 */
export interface ProductDetailRealExtras {
  galleryUrls?: string[];
  colors?: string[];
  sizes?: { label: string; inStock: boolean }[];
  /** Haqiqiy SKU — ilgari `ECM-<id>` deb to'qib chiqarilardi. */
  sku?: string;
  weightGrams?: number | null;
  /** Sotuvchi yozgan tavsif. */
  description?: LocalizedText | null;
  /** Tasdiqlangan sharhlar. Bo'sh bo'lsa sahifada sharh ko'rsatilmaydi. */
  reviews?: ProductReview[];
}

// Keng tarqalgan rang nomlari → hex (variant rang tanlagichi uchun)
const COLOR_HEX: Record<string, string> = {
  qora: '#0f172a',
  black: '#0f172a',
  чёрный: '#0f172a',
  черный: '#0f172a',
  oq: '#f8fafc',
  white: '#f8fafc',
  белый: '#f8fafc',
  qizil: '#ef4444',
  red: '#ef4444',
  красный: '#ef4444',
  "ko'k": '#3b82f6',
  kok: '#3b82f6',
  blue: '#3b82f6',
  синий: '#3b82f6',
  yashil: '#22c55e',
  green: '#22c55e',
  зелёный: '#22c55e',
  зеленый: '#22c55e',
  sariq: '#f59e0b',
  yellow: '#f59e0b',
  жёлтый: '#f59e0b',
  желтый: '#f59e0b',
  kulrang: '#6b7280',
  gray: '#6b7280',
  grey: '#6b7280',
  серый: '#6b7280',
  jigarrang: '#92400e',
  brown: '#92400e',
  коричневый: '#92400e',
  pushti: '#ec4899',
  pink: '#ec4899',
  розовый: '#ec4899',
  binafsha: '#8b5cf6',
  purple: '#8b5cf6',
  фиолетовый: '#8b5cf6',
  bej: '#d6c7b0',
  beige: '#d6c7b0',
  бежевый: '#d6c7b0',
};
function colorToHex(name: string): string {
  return COLOR_HEX[name.trim().toLowerCase()] ?? '#9ca3af';
}

/**
 * Berilgan mahsulotdan (mock yoki DB'dan kelgan MockProduct) to'liq detali view-model quradi.
 * `real` berilsa — rasm/rang/o'lcham DB'dagi HAQIQIY ma'lumotdan (sintetik emas).
 * Sharh/savol/rating breakdown hali sintetik (Review jadvali keyingi bosqichda).
 */
export function buildProductDetail(
  product: MockProduct,
  real?: ProductDetailRealExtras,
): ProductFullDetail {
  const categorySlug = categoryIdToSlug(product.categoryId) || product.categoryId;
  const isFootwear = categorySlug === 'shoes';
  const isClothing = categorySlug === 'clothing';
  const hasSizes = isFootwear || isClothing;
  // Sharhlar faqat bazadan. Bo'lmasa — bo'sh ro'yxat, hech narsa to'qilmaydi.
  const reviews = real?.reviews ?? [];

  // Galereya: real URL'lar bo'lsa faqat ular; bo'lmasa seed placeholder'lar.
  const gallery: ProductGalleryImage[] =
    real?.galleryUrls && real.galleryUrls.length > 0
      ? real.galleryUrls.map((url, i) => ({ seed: `${product.imageSeed}-${i}`, url }))
      : product.imageUrl
        ? [{ seed: product.imageSeed, url: product.imageUrl }]
        : [
            { seed: product.imageSeed },
            { seed: `${product.imageSeed}-2` },
            { seed: `${product.imageSeed}-3` },
            { seed: `${product.imageSeed}-4` },
            { seed: `${product.imageSeed}-5` },
          ];

  // Rang/o'lcham: real (DB variantlari) berilsa — faqat ular (bo'sh bo'lsa ko'rsatilmaydi).
  const colors: ProductVariantColor[] = real
    ? (real.colors?.map((c) => ({ id: c, label: c, hex: colorToHex(c) })) ?? [])
    : FALLBACK_COLORS;
  const sizes: ProductVariantSize[] = real
    ? (real.sizes ?? []).map((s) => ({ id: s.label, label: s.label, inStock: s.inStock }))
    : hasSizes
      ? isFootwear
        ? FOOTWEAR_SIZES
        : CLOTHING_SIZES
      : [];

  return {
    product,
    // MUHIM: name.ru/name.en YO'Q bo'lishi mumkin — sotuvchi faqat nameUz bilan
    // mahsulot yarata oladi (apps/seller .../api/products: nameRu/nameEn optional).
    // To'g'ridan-to'g'ri interpolatsiya "undefined — премиальные..." chiqarardi va bu
    // meta description / OpenGraph'ga ham tushardi. pickLocale uz'ga qaytaradi.
    // Tavsif SOTUVCHIDAN keladi. Ilgari bu yerda har bir mahsulot uchun bir xil
    // shablon matn yozilardi ("premium material va zamonaviy dizayn uyg'unligi...
    // ergonomik shakl, chidamli komponentlar"), ya'ni platforma mahsulot haqida
    // bilmagan narsasini aytardi. Tavsif yo'q bo'lsa — hech narsa ko'rsatilmaydi.
    description: real?.description ?? null,
    // "Premium material", "Asl mahsulot kafolati" kabi belgilar OLIB TASHLANDI:
    // ular mahsulotdan emas, koddan kelardi va hech kim tekshirmagan kafolat edi.
    features: [],
    gallery,
    colors,
    sizes,
    // Xususiyatlar jadvalida FAQAT bazada bor maydonlar qoldi.
    //
    // Olib tashlanganlari va sababi:
    //   • "Kafolat: 12 oy"        — hech kim bunday kafolat bermagan
    //   • "Mamlakat: Italiya/Vetnam" — mahsulot id'sining xeshiga qarab tanlanardi,
    //     ya'ni ishlab chiqarilgan mamlakat o'ylab topilardi
    //   • "SKU: ECM-<id>"         — haqiqiy SKU bazada bor, u to'qishning hojati yo'q
    //   • "Reyting"               — reyting sahifaning boshqa joyida ko'rsatiladi
    specs: [
      ...(product.brand
        ? [{ label: { uz: 'Brend', ru: 'Бренд', en: 'Brand' }, value: product.brand }]
        : []),
      ...(real?.sku ? [{ label: { uz: 'SKU', ru: 'SKU', en: 'SKU' }, value: real.sku }] : []),
      ...(real?.weightGrams
        ? [
            {
              label: { uz: 'Vazn', ru: 'Вес', en: 'Weight' },
              value: `${real.weightGrams} g`,
            },
          ]
        : []),
    ],
    reviews,
    // Savol-javob bo'limi hali qurilmagan. Ilgari u sotuvchi nomidan
    // o'ylab topilgan javoblar ko'rsatardi.
    questions: [],
    ratingBreakdown: ratingBreakdownFrom(reviews),
  };
}

function categoryIdToSlug(categoryId: string): string {
  // Inline map — mock-data dagi kategoriya ID -> slug
  const map: Record<string, string> = {
    c1: 'clothing',
    c2: 'shoes',
    c3: 'perfume',
    c4: 'cosmetics',
    c5: 'beauty',
    c6: 'accessories',
  };
  return map[categoryId] ?? '';
}

export function getRelatedProducts(productId: string, limit = 4): MockProduct[] {
  const current = findById(products, productId);
  if (!current) return [];
  return products
    .filter((p) => p.categoryId === current.categoryId && p.id !== current.id)
    .slice(0, limit);
}
