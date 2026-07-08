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
  avatarSeed: string;
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
  description: LocalizedText;
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

const REVIEW_AUTHORS = [
  'Akmal K.',
  'Madina S.',
  'Bekzod A.',
  'Lola R.',
  'Jasur T.',
  'Diyora N.',
  'Husan I.',
  'Aziza U.',
];

const REVIEW_BODIES = [
  "Mahsulot juda sifatli, kutganimdan ham yaxshi chiqdi. Yetkazib berish ham tez bo'ldi, ertasi kuni keldi.",
  "O'lchami aniq, sayt tavsifiga to'liq mos. Tavsiya qilaman!",
  'Birinchi marta shu yerdan xarid qildim. Hammasi yaxshi, rahmat sotuvchiga.',
  "Narxi sifatga mos, ko'rinishi reklamadan ham chiroyli.",
  'Yaxshi mahsulot, lekin yetkazib berish bir kun kechikdi. Lekin baribir tavsiya qilaman.',
  'Asl mahsulot, hech qanday muammosiz oldim. Faqat qadoq biroz shikastlanganday edi.',
];

function pseudoRandom(seed: string, max: number, offset = 0): number {
  let hash = offset;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash) % max;
}

const NOW = new Date('2026-06-06T10:00:00Z').getTime();

function buildReviews(productId: string, total: number): ProductReview[] {
  const n = Math.min(total, 6);
  return Array.from({ length: n }, (_, i) => {
    const idx = pseudoRandom(productId, REVIEW_BODIES.length, i);
    const rating = 3 + ((i + pseudoRandom(productId, 3, i)) % 3); // 3..5
    return {
      id: `r-${productId}-${i}`,
      author: REVIEW_AUTHORS[(idx + i) % REVIEW_AUTHORS.length]!,
      avatarSeed: `avatar-${productId}-${i}`,
      rating,
      body: REVIEW_BODIES[idx]!,
      createdAt: new Date(NOW - (i * 5 + 3) * 86_400_000).toISOString(),
      verifiedPurchase: i % 2 === 0,
      helpfulCount: pseudoRandom(productId, 50, i),
    };
  });
}

function buildQuestions(productId: string): ProductQuestion[] {
  return [
    {
      id: `q-${productId}-1`,
      author: 'Foydalanuvchi',
      question: 'Yetkazib berish qancha vaqt oladi?',
      answer:
        "Toshkent bo'yicha 24 soat ichida, viloyatlarga 2-3 ish kuni. Express variant ham mavjud.",
      answeredBy: 'Sotuvchi',
      createdAt: new Date(NOW - 7 * 86_400_000).toISOString(),
    },
    {
      id: `q-${productId}-2`,
      author: 'Anonim',
      question: 'Asl mahsulotmi?',
      answer: 'Ha, 100% asl mahsulot kafolati bilan. Rasmiy distribyutordan keladi.',
      answeredBy: 'Sotuvchi',
      createdAt: new Date(NOW - 14 * 86_400_000).toISOString(),
    },
  ];
}

function buildRatingBreakdown(productId: string): Record<1 | 2 | 3 | 4 | 5, number> {
  // Reyting taqsimoti, foiz — yuqori reytingda 5 ga ko'p, pastlarga oz.
  const seed = pseudoRandom(productId, 100, 0);
  const five = 55 + (seed % 30);
  const four = 20 + (seed % 15);
  const three = Math.max(2, 10 - (seed % 5));
  const two = Math.max(1, 5 - (seed % 3));
  const one = Math.max(1, 100 - five - four - three - two);
  return { 1: one, 2: two, 3: three, 4: four, 5: five };
}

export function getProductDetail(slugOrId: string): ProductFullDetail | undefined {
  const product = products.find((p) => p.slug === slugOrId || p.id === slugOrId);
  if (!product) return undefined;
  return buildProductDetail(product);
}

/** DB'dan kelgan real qo'shimchalar (rasm/variant) — berilsa sintetik o'rniga shular ishlatiladi. */
export interface ProductDetailRealExtras {
  galleryUrls?: string[];
  colors?: string[];
  sizes?: { label: string; inStock: boolean }[];
}

// Keng tarqalgan rang nomlari → hex (variant rang tanlagichi uchun)
const COLOR_HEX: Record<string, string> = {
  qora: '#0f172a', black: '#0f172a', 'чёрный': '#0f172a', 'черный': '#0f172a',
  oq: '#f8fafc', white: '#f8fafc', 'белый': '#f8fafc',
  qizil: '#ef4444', red: '#ef4444', 'красный': '#ef4444',
  "ko'k": '#3b82f6', kok: '#3b82f6', blue: '#3b82f6', 'синий': '#3b82f6',
  yashil: '#22c55e', green: '#22c55e', 'зелёный': '#22c55e', 'зеленый': '#22c55e',
  sariq: '#f59e0b', yellow: '#f59e0b', 'жёлтый': '#f59e0b', 'желтый': '#f59e0b',
  kulrang: '#6b7280', gray: '#6b7280', grey: '#6b7280', 'серый': '#6b7280',
  jigarrang: '#92400e', brown: '#92400e', 'коричневый': '#92400e',
  pushti: '#ec4899', pink: '#ec4899', 'розовый': '#ec4899',
  binafsha: '#8b5cf6', purple: '#8b5cf6', 'фиолетовый': '#8b5cf6',
  bej: '#d6c7b0', beige: '#d6c7b0', 'бежевый': '#d6c7b0',
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
    ? real.colors?.map((c) => ({ id: c, label: c, hex: colorToHex(c) })) ?? []
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
    description: {
      uz: `${product.name.uz} — premium material va zamonaviy dizayn uyg'unligi. Har bir detal o'ylab tayyorlangan: ergonomik shakl, chidamli komponentlar va estetik ko'rinish. Kundalik foydalanish uchun ham, maxsus tadbirlar uchun ham mos.`,
      ru: `${product.name.ru} — премиальные материалы и современный дизайн. Каждая деталь продумана: эргономичная форма, прочные компоненты и эстетичный вид.`,
      en: `${product.name.en} — premium materials meet modern design. Every detail is carefully crafted: ergonomic shape, durable components, and aesthetic appeal.`,
    },
    features: [
      { uz: 'Premium material', ru: 'Премиальный материал', en: 'Premium material' },
      {
        uz: 'Zamonaviy va minimalist dizayn',
        ru: 'Современный минималистичный дизайн',
        en: 'Modern minimalist design',
      },
      { uz: 'Qulay foydalanish', ru: 'Удобное использование', en: 'Comfortable use' },
      { uz: 'Asl mahsulot kafolati', ru: 'Гарантия подлинности', en: 'Authenticity guaranteed' },
    ],
    gallery,
    colors,
    sizes,
    specs: [
      { label: { uz: 'Brend', ru: 'Бренд', en: 'Brand' }, value: product.brand },
      { label: { uz: 'Modeli', ru: 'Модель', en: 'Model' }, value: product.name.uz },
      { label: { uz: 'SKU', ru: 'SKU', en: 'SKU' }, value: `ECM-${product.id.toUpperCase()}` },
      { label: { uz: 'Kafolat', ru: 'Гарантия', en: 'Warranty' }, value: '12 oy' },
      {
        label: { uz: 'Mamlakat', ru: 'Страна', en: 'Country' },
        value: pseudoRandom(product.id, 4) === 0 ? 'Italiya' : 'Vetnam',
      },
      {
        label: { uz: 'Reyting', ru: 'Рейтинг', en: 'Rating' },
        value: `${product.rating.toFixed(1)} / 5.0`,
      },
    ],
    reviews: buildReviews(product.id, product.reviewCount),
    questions: buildQuestions(product.id),
    ratingBreakdown: buildRatingBreakdown(product.id),
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
