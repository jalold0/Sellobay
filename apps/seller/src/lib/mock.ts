// Sotuvchining shaxsiy ko`rinishidagi mock data.
// Faqat sotuvchiga tegishli mahsulot va buyurtmalar.

export type LocalizedText = { uz: string; ru?: string; en?: string };

export interface SellerProduct {
  id: string;
  sku: string;
  name: LocalizedText;
  imageUrl: string;
  status: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'ARCHIVED' | 'OUT_OF_STOCK';
  basePrice: number;
  stock: number;
  soldCount: number;
  rating: number;
  reviewCount: number;
  category: LocalizedText;
  createdAt: string;
}

export interface SellerOrder {
  id: string;
  number: string;
  customerName: string;
  itemsCount: number;
  status: 'PENDING' | 'CONFIRMED' | 'PAID' | 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';
  grandTotal: number;
  placedAt: string;
  city: string;
}

export interface SellerReturn {
  id: string;
  orderNumber: string;
  customerName: string;
  productName: LocalizedText;
  reason: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  refundAmount: number;
  requestedAt: string;
}

export interface SellerPayout {
  id: string;
  periodStart: string;
  periodEnd: string;
  ordersCount: number;
  grossAmount: number;
  commission: number;
  netAmount: number;
  status: 'PENDING' | 'PAID' | 'FAILED';
  paidAt?: string;
}

const NOW = new Date('2026-06-06T10:00:00Z').getTime();
function dateAgo(days: number) {
  return new Date(NOW - days * 86_400_000).toISOString();
}

const STATUSES: SellerProduct['status'][] = ['ACTIVE', 'ACTIVE', 'DRAFT', 'PENDING_REVIEW', 'OUT_OF_STOCK', 'ARCHIVED'];
const PROD_NAMES = [
  { uz: 'Nike Air Max 270', ru: 'Nike Air Max 270', en: 'Nike Air Max 270' },
  { uz: 'Adidas Originals futbolka', ru: 'Adidas Originals футболка', en: 'Adidas Originals tee' },
  { uz: 'Charm tufli', ru: 'Кожаные туфли', en: 'Leather shoes' },
  { uz: 'Yoz ko`ylagi', ru: 'Летняя рубашка', en: 'Summer shirt' },
  { uz: 'Sport krossovka', ru: 'Спортивные кроссовки', en: 'Sport sneakers' },
  { uz: 'Klassik kostyum', ru: 'Классический костюм', en: 'Classic suit' },
];

export const sellerProducts: SellerProduct[] = Array.from({ length: 28 }, (_, i) => ({
  id: `sp-${i + 1}`,
  sku: `SK-${(i + 1).toString().padStart(6, '0')}`,
  name: PROD_NAMES[i % PROD_NAMES.length]!,
  imageUrl: `https://picsum.photos/seed/seller-${i}/200/200`,
  status: STATUSES[i % STATUSES.length]!,
  basePrice: 199_000 + (i * 53_000) % 2_000_000,
  stock: Math.max(0, (i * 7) % 90 - 5),
  soldCount: (i * 13) % 240,
  rating: Number((3.8 + (i % 10) * 0.1).toFixed(1)),
  reviewCount: (i * 5) % 180,
  category: { uz: 'Kiyim-kechak', ru: 'Одежда' },
  createdAt: dateAgo(i * 2),
}));

const CITIES = ['Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Farg`ona'];
const ORDER_STATUSES: SellerOrder['status'][] = [
  'PENDING', 'CONFIRMED', 'PAID', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'DELIVERED', 'CANCELLED', 'RETURNED',
];

export const sellerOrders: SellerOrder[] = Array.from({ length: 42 }, (_, i) => ({
  id: `so-${i + 1}`,
  number: `ORD-2026-${(2300 + i).toString().padStart(8, '0')}`,
  customerName: ['Akmal Karimov', 'Madina Saidova', 'Bekzod Aliyev', 'Lola Rasulova', 'Jasur Toshmatov'][i % 5]!,
  itemsCount: 1 + (i % 5),
  status: ORDER_STATUSES[i % ORDER_STATUSES.length]!,
  grandTotal: 280_000 + (i * 92_000) % 3_500_000,
  placedAt: dateAgo(i * 0.4),
  city: CITIES[i % CITIES.length]!,
}));

export const sellerReturns: SellerReturn[] = Array.from({ length: 8 }, (_, i) => ({
  id: `sr-${i + 1}`,
  orderNumber: `ORD-2026-${(2300 + i * 3).toString().padStart(8, '0')}`,
  customerName: ['Akmal Karimov', 'Madina Saidova', 'Bekzod Aliyev'][i % 3]!,
  productName: PROD_NAMES[i % PROD_NAMES.length]!,
  reason: ['O`lcham mos kelmadi', 'Sifat past', 'Boshqa rang kerak', 'Yetkazib berishda shikast'][i % 4]!,
  status: (['REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'] as const)[i % 4]!,
  refundAmount: 200_000 + i * 87_000,
  requestedAt: dateAgo(i * 2 + 1),
}));

export const sellerPayouts: SellerPayout[] = Array.from({ length: 6 }, (_, i) => ({
  id: `pa-${i + 1}`,
  periodStart: dateAgo((i + 1) * 14),
  periodEnd: dateAgo(i * 14),
  ordersCount: 25 + (i * 7) % 30,
  grossAmount: 12_500_000 + i * 2_200_000,
  commission: (12_500_000 + i * 2_200_000) * 0.1,
  netAmount: (12_500_000 + i * 2_200_000) * 0.9,
  status: (i === 0 ? 'PENDING' : 'PAID') as SellerPayout['status'],
  paidAt: i === 0 ? undefined : dateAgo(i * 14 - 1),
}));

// Sotuvchi dashboard uchun daromad seriyasi
export const sellerRevenueSeries = Array.from({ length: 30 }, (_, i) => {
  const day = 29 - i;
  return {
    date: new Date(NOW - day * 86_400_000).toISOString().slice(0, 10),
    revenue: 800_000 + Math.round(Math.sin(i / 3) * 250_000 + i * 12_000),
    orders: 4 + Math.round(Math.cos(i / 4) * 2 + i * 0.1),
  };
});
