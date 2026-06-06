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
  logoText: string;
  logoBg: string;
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
}

export const categories: MockCategory[] = [
  { id: 'c1', slug: 'clothing', name: { uz: 'Kiyim-kechak', ru: 'Одежда', en: 'Clothing' }, emoji: '👕', imageSeed: 'clothing-1', productCount: 1280 },
  { id: 'c2', slug: 'shoes', name: { uz: 'Poyabzal', ru: 'Обувь', en: 'Shoes' }, emoji: '👟', imageSeed: 'shoes-1', productCount: 642 },
  { id: 'c3', slug: 'perfume', name: { uz: 'Atirlar', ru: 'Парфюмерия', en: 'Perfume' }, emoji: '🌸', imageSeed: 'perfume-1', productCount: 318 },
  { id: 'c4', slug: 'cosmetics', name: { uz: 'Kosmetika', ru: 'Косметика', en: 'Cosmetics' }, emoji: '💄', imageSeed: 'cosmetics-1', productCount: 521 },
  { id: 'c5', slug: 'beauty', name: { uz: "Go'zallik", ru: 'Красота', en: 'Beauty' }, emoji: '✨', imageSeed: 'beauty-1', productCount: 274 },
  { id: 'c6', slug: 'accessories', name: { uz: 'Aksessuarlar', ru: 'Аксессуары', en: 'Accessories' }, emoji: '👜', imageSeed: 'accessories-1', productCount: 412 },
];

export const brands: MockBrand[] = [
  { id: 'b1', slug: 'nike', name: 'Nike', logoText: 'NIKE', logoBg: '#000000' },
  { id: 'b2', slug: 'adidas', name: 'Adidas', logoText: 'adidas', logoBg: '#000000' },
  { id: 'b3', slug: 'zara', name: 'Zara', logoText: 'ZARA', logoBg: '#1a1a1a' },
  { id: 'b4', slug: 'chanel', name: 'Chanel', logoText: 'CHANEL', logoBg: '#000000' },
  { id: 'b5', slug: 'dior', name: 'Dior', logoText: 'Dior', logoBg: '#000000' },
  { id: 'b6', slug: 'gucci', name: 'Gucci', logoText: 'GUCCI', logoBg: '#006400' },
  { id: 'b7', slug: 'prada', name: 'Prada', logoText: 'PRADA', logoBg: '#000000' },
  { id: 'b8', slug: 'puma', name: 'Puma', logoText: 'PUMA', logoBg: '#000000' },
];

export const products: MockProduct[] = [
  { id: 'p1', slug: 'nike-air-max-270', name: { uz: 'Nike Air Max 270', ru: 'Nike Air Max 270', en: 'Nike Air Max 270' }, brand: 'Nike', brandId: 'b1', categoryId: 'c2', price: 1_490_000, oldPrice: 1_790_000, currency: 'UZS', rating: 4.8, reviewCount: 124, imageSeed: 'nike-air-max', badge: 'SALE', inStock: true },
  { id: 'p2', slug: 'adidas-ultraboost-22', name: { uz: 'Adidas Ultraboost 22', ru: 'Adidas Ultraboost 22', en: 'Adidas Ultraboost 22' }, brand: 'Adidas', brandId: 'b2', categoryId: 'c2', price: 1_890_000, currency: 'UZS', rating: 4.7, reviewCount: 89, imageSeed: 'adidas-ub', badge: 'NEW', inStock: true },
  { id: 'p3', slug: 'zara-oversized-blazer', name: { uz: "Zara Oversize Pidjak", ru: 'Zara Oversize Пиджак', en: 'Zara Oversize Blazer' }, brand: 'Zara', brandId: 'b3', categoryId: 'c1', price: 890_000, currency: 'UZS', rating: 4.5, reviewCount: 56, imageSeed: 'zara-blazer', inStock: true },
  { id: 'p4', slug: 'chanel-no5-edp-100ml', name: { uz: "Chanel N°5 Eau de Parfum 100ml", ru: 'Chanel N°5 Парфюмерная вода 100мл', en: 'Chanel N°5 Eau de Parfum 100ml' }, brand: 'Chanel', brandId: 'b4', categoryId: 'c3', price: 2_790_000, currency: 'UZS', rating: 4.9, reviewCount: 312, imageSeed: 'chanel-no5', badge: 'TOP', inStock: true },
  { id: 'p5', slug: 'dior-sauvage-edp-100ml', name: { uz: 'Dior Sauvage EDP 100ml', ru: 'Dior Sauvage EDP 100мл', en: 'Dior Sauvage EDP 100ml' }, brand: 'Dior', brandId: 'b5', categoryId: 'c3', price: 1_990_000, oldPrice: 2_350_000, currency: 'UZS', rating: 4.8, reviewCount: 217, imageSeed: 'dior-sauvage', badge: 'SALE', inStock: true },
  { id: 'p6', slug: 'gucci-leather-handbag', name: { uz: "Gucci Charm Sumka", ru: 'Gucci Сумка Charm', en: 'Gucci Charm Handbag' }, brand: 'Gucci', brandId: 'b6', categoryId: 'c6', price: 4_890_000, currency: 'UZS', rating: 4.9, reviewCount: 41, imageSeed: 'gucci-bag', badge: 'TOP', inStock: true },
  { id: 'p7', slug: 'puma-rs-x', name: { uz: 'Puma RS-X', ru: 'Puma RS-X', en: 'Puma RS-X' }, brand: 'Puma', brandId: 'b8', categoryId: 'c2', price: 990_000, currency: 'UZS', rating: 4.3, reviewCount: 38, imageSeed: 'puma-rsx', inStock: false },
  { id: 'p8', slug: 'prada-re-edition-2005', name: { uz: 'Prada Re-Edition 2005 sumka', ru: 'Prada Re-Edition 2005 сумка', en: 'Prada Re-Edition 2005 bag' }, brand: 'Prada', brandId: 'b7', categoryId: 'c6', price: 5_290_000, currency: 'UZS', rating: 4.7, reviewCount: 22, imageSeed: 'prada-bag', badge: 'NEW', inStock: true },
  { id: 'p9', slug: 'mac-ruby-woo-lipstick', name: { uz: 'MAC Ruby Woo lipstick', ru: 'MAC Ruby Woo помада', en: 'MAC Ruby Woo Lipstick' }, brand: 'MAC', brandId: 'b1', categoryId: 'c4', price: 290_000, currency: 'UZS', rating: 4.8, reviewCount: 504, imageSeed: 'mac-ruby', badge: 'TOP', inStock: true },
  { id: 'p10', slug: 'la-mer-creme-30ml', name: { uz: 'La Mer Crème 30ml', ru: 'La Mer Крем 30мл', en: 'La Mer Crème 30ml' }, brand: 'La Mer', brandId: 'b1', categoryId: 'c5', price: 3_490_000, currency: 'UZS', rating: 4.9, reviewCount: 87, imageSeed: 'la-mer', inStock: true },
  { id: 'p11', slug: 'nike-tech-fleece-hoodie', name: { uz: 'Nike Tech Fleece Hoodie', ru: 'Nike Tech Fleece Худи', en: 'Nike Tech Fleece Hoodie' }, brand: 'Nike', brandId: 'b1', categoryId: 'c1', price: 1_290_000, oldPrice: 1_490_000, currency: 'UZS', rating: 4.6, reviewCount: 71, imageSeed: 'nike-hoodie', badge: 'SALE', inStock: true },
  { id: 'p12', slug: 'adidas-trefoil-tshirt', name: { uz: 'Adidas Trefoil T-shirt', ru: 'Adidas Trefoil Футболка', en: 'Adidas Trefoil T-shirt' }, brand: 'Adidas', brandId: 'b2', categoryId: 'c1', price: 390_000, currency: 'UZS', rating: 4.4, reviewCount: 152, imageSeed: 'adidas-tee', inStock: true },
];

export function productImage(seed: string, size = 400): string {
  return `https://picsum.photos/seed/${seed}/${size}/${size}`;
}

export function pickLocale<T extends LocalizedText>(value: T, locale: string): string {
  return value[locale as Locale] ?? value.uz;
}

export function findById<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((x) => x.id === id);
}

export function findBySlug<T extends { slug: string }>(list: T[], slug: string): T | undefined {
  return list.find((x) => x.slug === slug);
}
