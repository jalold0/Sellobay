// Mobile mock-data — web bilan uyg'unlashtirilgan minimal nusxa.
// Backend tayyor bo'lganda useQuery'ga ko'chiriladi.

export type Locale = 'uz' | 'ru' | 'en';
export type LocalizedText = Record<Locale, string>;

export interface MockCategory {
  id: string;
  slug: string;
  name: LocalizedText;
  emoji: string;
  imageSeed: string;
  productCount: number;
}

export interface MockBrand {
  id: string;
  slug: string;
  name: string;
}

export interface MockProduct {
  id: string;
  slug: string;
  name: LocalizedText;
  brand: string;
  brandId: string;
  categoryId: string;
  price: number;
  oldPrice?: number;
  currency: 'UZS';
  rating: number;
  reviewCount: number;
  imageSeed: string;
  badge?: 'NEW' | 'SALE' | 'TOP';
  inStock: boolean;
  // Yetkazish/ishonch signallari (Coupang uslubi) — hammasi IXTIYORIY,
  // jonli useProducts API bu maydonlarni yubormasligi mumkin.
  freeShipping?: boolean;
  // Lokal: 'tomorrow' (Ertaga) | 'fast' (Tez). Yo'q bo'lsa card default beradi.
  delivery?: 'tomorrow' | 'fast';
  // Global (import) mahsulotlar uchun
  origin?: 'local' | 'global';
  sourceCountry?: 'CN' | 'TR' | 'KR';
  deliveryDays?: number; // global yetkazish muddati (kun)
  // Ijtimoiy isbot / marketing (Coupang/Temu uslubi) — ixtiyoriy
  soldCount?: number; // nechta sotilgan
  couponAmount?: number; // so'mda kupon (mock — kupon tizimi keyin)
}

export const categories: MockCategory[] = [
  {
    id: 'c1',
    slug: 'clothing',
    name: { uz: 'Kiyim-kechak', ru: 'Одежда', en: 'Clothing' },
    emoji: '👕',
    imageSeed: 'clothing-1',
    productCount: 1280,
  },
  {
    id: 'c2',
    slug: 'shoes',
    name: { uz: 'Poyabzal', ru: 'Обувь', en: 'Shoes' },
    emoji: '👟',
    imageSeed: 'shoes-1',
    productCount: 642,
  },
  {
    id: 'c3',
    slug: 'perfume',
    name: { uz: 'Atirlar', ru: 'Парфюмерия', en: 'Perfume' },
    emoji: '🌸',
    imageSeed: 'perfume-1',
    productCount: 318,
  },
  {
    id: 'c4',
    slug: 'cosmetics',
    name: { uz: 'Kosmetika', ru: 'Косметика', en: 'Cosmetics' },
    emoji: '💄',
    imageSeed: 'cosmetics-1',
    productCount: 521,
  },
  {
    id: 'c5',
    slug: 'beauty',
    name: { uz: "Go'zallik", ru: 'Красота', en: 'Beauty' },
    emoji: '✨',
    imageSeed: 'beauty-1',
    productCount: 274,
  },
  {
    id: 'c6',
    slug: 'accessories',
    name: { uz: 'Aksessuarlar', ru: 'Аксессуары', en: 'Accessories' },
    emoji: '👜',
    imageSeed: 'accessories-1',
    productCount: 412,
  },
];

export const brands: MockBrand[] = [
  { id: 'b1', slug: 'nike', name: 'Nike' },
  { id: 'b2', slug: 'adidas', name: 'Adidas' },
  { id: 'b3', slug: 'zara', name: 'Zara' },
  { id: 'b4', slug: 'chanel', name: 'Chanel' },
  { id: 'b5', slug: 'dior', name: 'Dior' },
  { id: 'b6', slug: 'gucci', name: 'Gucci' },
  { id: 'b7', slug: 'prada', name: 'Prada' },
  { id: 'b8', slug: 'puma', name: 'Puma' },
];

export const products: MockProduct[] = [
  {
    id: 'p1',
    slug: 'nike-air-max-270',
    name: { uz: 'Nike Air Max 270', ru: 'Nike Air Max 270', en: 'Nike Air Max 270' },
    brand: 'Nike',
    brandId: 'b1',
    categoryId: 'c2',
    price: 1_490_000,
    oldPrice: 1_790_000,
    currency: 'UZS',
    rating: 4.8,
    reviewCount: 124,
    imageSeed: 'nike-air-max',
    badge: 'SALE',
    inStock: true,
    delivery: 'tomorrow',
    freeShipping: true,
    soldCount: 2340,
    couponAmount: 20_000,
  },
  {
    id: 'p2',
    slug: 'adidas-ultraboost-22',
    name: { uz: 'Adidas Ultraboost 22', ru: 'Adidas Ultraboost 22', en: 'Adidas Ultraboost 22' },
    brand: 'Adidas',
    brandId: 'b2',
    categoryId: 'c2',
    price: 1_890_000,
    currency: 'UZS',
    rating: 4.7,
    reviewCount: 89,
    imageSeed: 'adidas-ub',
    badge: 'NEW',
    inStock: true,
    delivery: 'fast',
    soldCount: 890,
  },
  {
    id: 'p3',
    slug: 'zara-oversized-blazer',
    name: { uz: 'Zara Oversize Pidjak', ru: 'Zara Oversize Пиджак', en: 'Zara Oversize Blazer' },
    brand: 'Zara',
    brandId: 'b3',
    categoryId: 'c1',
    price: 890_000,
    currency: 'UZS',
    rating: 4.5,
    reviewCount: 56,
    imageSeed: 'zara-blazer',
    inStock: true,
  },
  {
    id: 'p4',
    slug: 'chanel-no5-edp-100ml',
    name: { uz: 'Chanel N°5 EDP 100ml', ru: 'Chanel N°5 EDP 100мл', en: 'Chanel N°5 EDP 100ml' },
    brand: 'Chanel',
    brandId: 'b4',
    categoryId: 'c3',
    price: 2_790_000,
    currency: 'UZS',
    rating: 4.9,
    reviewCount: 312,
    imageSeed: 'chanel-no5',
    badge: 'TOP',
    inStock: true,
    delivery: 'tomorrow',
    freeShipping: true,
    soldCount: 1520,
  },
  {
    id: 'p5',
    slug: 'dior-sauvage-edp-100ml',
    name: {
      uz: 'Dior Sauvage EDP 100ml',
      ru: 'Dior Sauvage EDP 100мл',
      en: 'Dior Sauvage EDP 100ml',
    },
    brand: 'Dior',
    brandId: 'b5',
    categoryId: 'c3',
    price: 1_990_000,
    oldPrice: 2_350_000,
    currency: 'UZS',
    rating: 4.8,
    reviewCount: 217,
    imageSeed: 'dior-sauvage',
    badge: 'SALE',
    inStock: true,
    delivery: 'fast',
    freeShipping: true,
    soldCount: 3100,
    couponAmount: 50_000,
  },
  {
    id: 'p6',
    slug: 'gucci-leather-handbag',
    name: { uz: 'Gucci Charm Sumka', ru: 'Gucci Сумка Charm', en: 'Gucci Charm Handbag' },
    brand: 'Gucci',
    brandId: 'b6',
    categoryId: 'c6',
    price: 4_890_000,
    currency: 'UZS',
    rating: 4.9,
    reviewCount: 41,
    imageSeed: 'gucci-bag',
    badge: 'TOP',
    inStock: true,
    soldCount: 210,
  },
  {
    id: 'p7',
    slug: 'puma-rs-x',
    name: { uz: 'Puma RS-X', ru: 'Puma RS-X', en: 'Puma RS-X' },
    brand: 'Puma',
    brandId: 'b8',
    categoryId: 'c2',
    price: 990_000,
    currency: 'UZS',
    rating: 4.3,
    reviewCount: 38,
    imageSeed: 'puma-rsx',
    inStock: false,
  },
  {
    id: 'p8',
    slug: 'prada-re-edition-2005',
    name: {
      uz: 'Prada Re-Edition 2005 sumka',
      ru: 'Prada Re-Edition 2005 сумка',
      en: 'Prada Re-Edition 2005 bag',
    },
    brand: 'Prada',
    brandId: 'b7',
    categoryId: 'c6',
    price: 5_290_000,
    currency: 'UZS',
    rating: 4.7,
    reviewCount: 22,
    imageSeed: 'prada-bag',
    badge: 'NEW',
    inStock: true,
  },
  {
    id: 'p9',
    slug: 'mac-ruby-woo-lipstick',
    name: { uz: 'MAC Ruby Woo lipstick', ru: 'MAC Ruby Woo помада', en: 'MAC Ruby Woo Lipstick' },
    brand: 'MAC',
    brandId: 'b1',
    categoryId: 'c4',
    price: 290_000,
    currency: 'UZS',
    rating: 4.8,
    reviewCount: 504,
    imageSeed: 'mac-ruby',
    badge: 'TOP',
    inStock: true,
    delivery: 'tomorrow',
    freeShipping: true,
    soldCount: 5600,
  },
  {
    id: 'p10',
    slug: 'la-mer-creme-30ml',
    name: { uz: 'La Mer Crème 30ml', ru: 'La Mer Крем 30мл', en: 'La Mer Crème 30ml' },
    brand: 'La Mer',
    brandId: 'b1',
    categoryId: 'c5',
    price: 3_490_000,
    currency: 'UZS',
    rating: 4.9,
    reviewCount: 87,
    imageSeed: 'la-mer',
    inStock: true,
  },
  {
    id: 'p11',
    slug: 'nike-tech-fleece-hoodie',
    name: {
      uz: 'Nike Tech Fleece Hoodie',
      ru: 'Nike Tech Fleece Худи',
      en: 'Nike Tech Fleece Hoodie',
    },
    brand: 'Nike',
    brandId: 'b1',
    categoryId: 'c1',
    price: 1_290_000,
    oldPrice: 1_490_000,
    currency: 'UZS',
    rating: 4.6,
    reviewCount: 71,
    imageSeed: 'nike-hoodie',
    badge: 'SALE',
    inStock: true,
    delivery: 'tomorrow',
    freeShipping: true,
    soldCount: 1240,
  },
  {
    id: 'p12',
    slug: 'adidas-trefoil-tshirt',
    name: {
      uz: 'Adidas Trefoil T-shirt',
      ru: 'Adidas Trefoil Футболка',
      en: 'Adidas Trefoil T-shirt',
    },
    brand: 'Adidas',
    brandId: 'b2',
    categoryId: 'c1',
    price: 390_000,
    currency: 'UZS',
    rating: 4.4,
    reviewCount: 152,
    imageSeed: 'adidas-tee',
    inStock: true,
  },
];

// ─── Subkategoriyalar (2-panel kategoriya sahifasi uchun) ────────
export interface MockSubcategory {
  name: LocalizedText;
  imageSeed: string;
}

// Kategoriya id → subkategoriyalar. Tap → parent kategoriya katalogiga.
export const subcategories: Record<string, MockSubcategory[]> = {
  c1: [
    { name: { uz: 'Kurtkalar', ru: 'Куртки', en: 'Jackets' }, imageSeed: 'sub-jackets' },
    { name: { uz: "Ko'ylaklar", ru: 'Рубашки', en: 'Shirts' }, imageSeed: 'sub-shirts' },
    { name: { uz: 'Shimlar', ru: 'Брюки', en: 'Trousers' }, imageSeed: 'sub-trousers' },
    { name: { uz: 'Futbolkalar', ru: 'Футболки', en: 'T-shirts' }, imageSeed: 'sub-tshirts' },
    { name: { uz: 'Kostyumlar', ru: 'Костюмы', en: 'Suits' }, imageSeed: 'sub-suits' },
    { name: { uz: 'Trikotaj', ru: 'Трикотаж', en: 'Knitwear' }, imageSeed: 'sub-knit' },
  ],
  c2: [
    { name: { uz: 'Krossovkalar', ru: 'Кроссовки', en: 'Sneakers' }, imageSeed: 'sub-sneakers' },
    { name: { uz: 'Botinkalar', ru: 'Ботинки', en: 'Boots' }, imageSeed: 'sub-boots' },
    { name: { uz: 'Tuflilar', ru: 'Туфли', en: 'Shoes' }, imageSeed: 'sub-shoes' },
    { name: { uz: 'Sandallar', ru: 'Сандалии', en: 'Sandals' }, imageSeed: 'sub-sandals' },
    { name: { uz: 'Sport poyabzal', ru: 'Спортивная', en: 'Athletic' }, imageSeed: 'sub-athletic' },
  ],
  c3: [
    { name: { uz: 'Erkaklar uchun', ru: 'Мужские', en: 'For men' }, imageSeed: 'sub-men-perfume' },
    {
      name: { uz: 'Ayollar uchun', ru: 'Женские', en: 'For women' },
      imageSeed: 'sub-women-perfume',
    },
    { name: { uz: 'Uniseks', ru: 'Унисекс', en: 'Unisex' }, imageSeed: 'sub-unisex' },
    { name: { uz: 'Parfyum suvi', ru: 'Парфюм. вода', en: 'EDP' }, imageSeed: 'sub-edp' },
    { name: { uz: 'Dezodorant', ru: 'Дезодорант', en: 'Deodorant' }, imageSeed: 'sub-deo' },
  ],
  c4: [
    { name: { uz: 'Yuz uchun', ru: 'Для лица', en: 'Face' }, imageSeed: 'sub-face' },
    { name: { uz: "Ko'z uchun", ru: 'Для глаз', en: 'Eyes' }, imageSeed: 'sub-eyes' },
    { name: { uz: 'Lab uchun', ru: 'Для губ', en: 'Lips' }, imageSeed: 'sub-lips' },
    { name: { uz: 'Tirnoq', ru: 'Ногти', en: 'Nails' }, imageSeed: 'sub-nails' },
    { name: { uz: 'Soch', ru: 'Волосы', en: 'Hair' }, imageSeed: 'sub-hair' },
  ],
  c5: [
    {
      name: { uz: 'Teri parvarishi', ru: 'Уход за кожей', en: 'Skincare' },
      imageSeed: 'sub-skincare',
    },
    { name: { uz: 'Niqoblar', ru: 'Маски', en: 'Masks' }, imageSeed: 'sub-masks' },
    { name: { uz: 'Kremlar', ru: 'Кремы', en: 'Creams' }, imageSeed: 'sub-creams' },
    { name: { uz: 'Serum', ru: 'Сыворотки', en: 'Serums' }, imageSeed: 'sub-serums' },
    { name: { uz: 'SPF', ru: 'SPF', en: 'SPF' }, imageSeed: 'sub-spf' },
  ],
  c6: [
    { name: { uz: 'Sumkalar', ru: 'Сумки', en: 'Bags' }, imageSeed: 'sub-bags' },
    { name: { uz: 'Soatlar', ru: 'Часы', en: 'Watches' }, imageSeed: 'sub-watches' },
    { name: { uz: "Ko'zoynak", ru: 'Очки', en: 'Eyewear' }, imageSeed: 'sub-eyewear' },
    { name: { uz: 'Kamarlar', ru: 'Ремни', en: 'Belts' }, imageSeed: 'sub-belts' },
    { name: { uz: 'Zargarlik', ru: 'Украшения', en: 'Jewelry' }, imageSeed: 'sub-jewelry' },
  ],
};

// ─── Global (import) demo katalog ────────────────────────────────
// Xitoy/Turkiya/Koreya mahsulotlari — so'mda narx, uzoqroq yetkazish.
// slug 'g-' prefiksi bilan → api.ts fetchProduct buni to'g'ridan-to'g'ri qaytaradi.
export const globalProducts: MockProduct[] = [
  {
    id: 'g1',
    slug: 'g-tws-earbuds',
    name: { uz: 'TWS simsiz quloqchin', ru: 'TWS наушники', en: 'TWS earbuds' },
    brand: 'Anker',
    brandId: 'anker',
    categoryId: 'c6',
    price: 89_000,
    oldPrice: 149_000,
    currency: 'UZS',
    rating: 4.6,
    reviewCount: 3400,
    imageSeed: 'g-earbuds',
    badge: 'SALE',
    inStock: true,
    origin: 'global',
    sourceCountry: 'CN',
    deliveryDays: 18,
    soldCount: 12000,
    freeShipping: true,
  },
  {
    id: 'g2',
    slug: 'g-smart-watch',
    name: { uz: 'Smart soat 1.8"', ru: 'Смарт-часы 1.8"', en: 'Smart watch 1.8"' },
    brand: 'Xiaomi',
    brandId: 'xiaomi',
    categoryId: 'c6',
    price: 142_000,
    oldPrice: 199_000,
    currency: 'UZS',
    rating: 4.5,
    reviewCount: 2100,
    imageSeed: 'g-watch',
    badge: 'SALE',
    inStock: true,
    origin: 'global',
    sourceCountry: 'CN',
    deliveryDays: 14,
    soldCount: 8700,
  },
  {
    id: 'g3',
    slug: 'g-hoodie-oversize',
    name: { uz: 'Oversize hudi', ru: 'Худи оверсайз', en: 'Oversize hoodie' },
    brand: 'Urban',
    brandId: 'urban',
    categoryId: 'c1',
    price: 119_000,
    currency: 'UZS',
    rating: 4.4,
    reviewCount: 900,
    imageSeed: 'g-hoodie',
    inStock: true,
    origin: 'global',
    sourceCountry: 'CN',
    deliveryDays: 16,
    soldCount: 4300,
  },
  {
    id: 'g4',
    slug: 'g-sneakers-mesh',
    name: { uz: 'Mesh krossovka', ru: 'Кроссовки mesh', en: 'Mesh sneakers' },
    brand: 'Feiyue',
    brandId: 'feiyue',
    categoryId: 'c2',
    price: 165_000,
    oldPrice: 210_000,
    currency: 'UZS',
    rating: 4.3,
    reviewCount: 1500,
    imageSeed: 'g-sneakers',
    badge: 'SALE',
    inStock: true,
    origin: 'global',
    sourceCountry: 'CN',
    deliveryDays: 20,
    soldCount: 6100,
  },
  {
    id: 'g5',
    slug: 'g-power-bank',
    name: { uz: 'Power bank 20000mAh', ru: 'Повербанк 20000мАч', en: 'Power bank 20000mAh' },
    brand: 'Anker',
    brandId: 'anker',
    categoryId: 'c6',
    price: 95_000,
    oldPrice: 140_000,
    currency: 'UZS',
    rating: 4.6,
    reviewCount: 4100,
    imageSeed: 'g-powerbank',
    badge: 'SALE',
    inStock: true,
    origin: 'global',
    sourceCountry: 'CN',
    deliveryDays: 18,
    soldCount: 11000,
    freeShipping: true,
  },
  {
    id: 'g6',
    slug: 'g-china-drone',
    name: { uz: 'Mini dron 4K', ru: 'Мини-дрон 4K', en: 'Mini drone 4K' },
    brand: 'DJI',
    brandId: 'dji',
    categoryId: 'c6',
    price: 1_890_000,
    oldPrice: 2_200_000,
    currency: 'UZS',
    rating: 4.8,
    reviewCount: 1200,
    imageSeed: 'g-drone',
    badge: 'TOP',
    inStock: true,
    origin: 'global',
    sourceCountry: 'CN',
    deliveryDays: 20,
    soldCount: 3400,
  },
  {
    id: 'g7',
    slug: 'g-turkish-jacket',
    name: { uz: 'Turk kurtkasi', ru: 'Турецкая куртка', en: 'Turkish jacket' },
    brand: 'LC Waikiki',
    brandId: 'lcw',
    categoryId: 'c1',
    price: 289_000,
    currency: 'UZS',
    rating: 4.7,
    reviewCount: 780,
    imageSeed: 'g-tr-jacket',
    badge: 'TOP',
    inStock: true,
    origin: 'global',
    sourceCountry: 'TR',
    deliveryDays: 12,
    soldCount: 2200,
    freeShipping: true,
  },
  {
    id: 'g8',
    slug: 'g-turkish-perfume',
    name: { uz: 'Turk atiri EDP', ru: 'Турецкий парфюм EDP', en: 'Turkish perfume EDP' },
    brand: 'Nishane',
    brandId: 'nishane',
    categoryId: 'c3',
    price: 175_000,
    currency: 'UZS',
    rating: 4.5,
    reviewCount: 640,
    imageSeed: 'g-tr-perfume',
    inStock: true,
    origin: 'global',
    sourceCountry: 'TR',
    deliveryDays: 12,
    soldCount: 1900,
  },
  {
    id: 'g9',
    slug: 'g-turkish-bag',
    name: { uz: 'Turk charm sumka', ru: 'Турецкая кож. сумка', en: 'Turkish leather bag' },
    brand: 'Derimod',
    brandId: 'derimod',
    categoryId: 'c6',
    price: 245_000,
    currency: 'UZS',
    rating: 4.4,
    reviewCount: 320,
    imageSeed: 'g-tr-bag',
    inStock: true,
    origin: 'global',
    sourceCountry: 'TR',
    deliveryDays: 12,
    soldCount: 800,
  },
  {
    id: 'g10',
    slug: 'g-korea-serum',
    name: { uz: 'Koreys serum', ru: 'Корейская сыворотка', en: 'Korean serum' },
    brand: 'COSRX',
    brandId: 'cosrx',
    categoryId: 'c5',
    price: 129_000,
    oldPrice: 169_000,
    currency: 'UZS',
    rating: 4.8,
    reviewCount: 5400,
    imageSeed: 'g-kr-serum',
    badge: 'SALE',
    inStock: true,
    origin: 'global',
    sourceCountry: 'KR',
    deliveryDays: 15,
    soldCount: 15000,
    freeShipping: true,
  },
  {
    id: 'g11',
    slug: 'g-korea-cushion',
    name: { uz: 'Koreys kushon', ru: 'Корейский кушон', en: 'Korean cushion' },
    brand: 'Laneige',
    brandId: 'laneige',
    categoryId: 'c4',
    price: 219_000,
    currency: 'UZS',
    rating: 4.7,
    reviewCount: 3200,
    imageSeed: 'g-kr-cushion',
    badge: 'TOP',
    inStock: true,
    origin: 'global',
    sourceCountry: 'KR',
    deliveryDays: 15,
    soldCount: 9800,
  },
  {
    id: 'g12',
    slug: 'g-korea-mask-set',
    name: { uz: 'Niqob to‘plami (10)', ru: 'Набор масок (10)', en: 'Mask set (10)' },
    brand: 'Mediheal',
    brandId: 'mediheal',
    categoryId: 'c5',
    price: 79_000,
    currency: 'UZS',
    rating: 4.7,
    reviewCount: 8900,
    imageSeed: 'g-kr-masks',
    badge: 'TOP',
    inStock: true,
    origin: 'global',
    sourceCountry: 'KR',
    deliveryDays: 15,
    soldCount: 22000,
    freeShipping: true,
  },
];

export function productImage(seed: string, size = 400): string {
  return `https://picsum.photos/seed/${seed}/${size}/${size}`;
}

export function findBySlug<T extends { slug: string }>(list: T[], slug: string): T | undefined {
  return list.find((x) => x.slug === slug);
}

export function findById<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((x) => x.id === id);
}

export function getRelatedProducts(productId: string, limit = 4): MockProduct[] {
  const current = findById(products, productId);
  if (!current) return [];
  return products
    .filter((p) => p.categoryId === current.categoryId && p.id !== productId)
    .slice(0, limit);
}
