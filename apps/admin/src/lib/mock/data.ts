// Deterministik mock data — backend tayyor bo'lmaganda UI ko'rinishi uchun.
// Kelajakda useQuery'ning queryFn'i `apiClient.get(...)` ga almashtirilsa, page'lar o'zgarmaydi.

import type {
  AdminUser,
  Brand,
  Category,
  Customer,
  Order,
  OrderDetail,
  Product,
  PromoCode,
  Seller,
} from './types';

const CITIES = ['Toshkent', 'Samarqand', 'Buxoro', 'Andijon', 'Farg`ona', 'Namangan', 'Qarshi', 'Nukus'];
const BRANDS = ['Nike', 'Adidas', 'Zara', 'Chanel', 'Dior', 'Gucci', 'Puma', 'H&M'];
const FIRST_NAMES = ['Ali', 'Vali', 'Hasan', 'Husan', 'Diyora', 'Madina', 'Aziza', 'Bekzod', 'Jasur', 'Lola'];
const LAST_NAMES = ['Karimov', 'Rasulov', 'Aliyev', 'Toshmatov', 'Yusupova', 'Saidova', 'Nazarov'];

function pad(n: number, len = 8): string {
  return n.toString().padStart(len, '0');
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!;
}

const NOW = new Date('2026-06-06T10:00:00Z').getTime();
function dateAgo(days: number): string {
  return new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();
}

export const mockBrands: Brand[] = BRANDS.map((name, i) => ({
  id: `brand-${i + 1}`,
  slug: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
  name,
  productCount: 8 + ((i * 7) % 40),
  isActive: i !== 6,
}));

export const mockCategories: Category[] = [
  { id: 'c1', slug: 'clothing', name: { uz: 'Kiyim-kechak', ru: 'Одежда', en: 'Clothing' }, isActive: true, position: 1, productCount: 248 },
  { id: 'c2', slug: 'shoes', name: { uz: 'Poyabzal', ru: 'Обувь', en: 'Shoes' }, isActive: true, position: 2, productCount: 142 },
  { id: 'c3', slug: 'perfume', name: { uz: 'Atirlar', ru: 'Парфюмерия', en: 'Perfume' }, isActive: true, position: 3, productCount: 87 },
  { id: 'c4', slug: 'cosmetics', name: { uz: 'Kosmetika', ru: 'Косметика', en: 'Cosmetics' }, isActive: true, position: 4, productCount: 113 },
  { id: 'c5', slug: 'beauty', name: { uz: "Go'zallik", ru: 'Красота', en: 'Beauty' }, isActive: true, position: 5, productCount: 64 },
  { id: 'c6', slug: 'accessories', name: { uz: 'Aksessuarlar', ru: 'Аксессуары', en: 'Accessories' }, isActive: true, position: 6, productCount: 95 },
];

function img(seed: string, size = 200): string {
  return `https://picsum.photos/seed/${seed}/${size}/${size}`;
}

const PRODUCT_NAMES = [
  { uz: 'Klassik ko`ylak', ru: 'Классическая рубашка', en: 'Classic shirt' },
  { uz: 'Sport krossovkasi', ru: 'Спортивные кроссовки', en: 'Sport sneakers' },
  { uz: 'Atir 100ml', ru: 'Парфюм 100мл', en: 'Perfume 100ml' },
  { uz: 'Yuz parvarish kremi', ru: 'Крем для лица', en: 'Face cream' },
  { uz: 'Charm sumka', ru: 'Кожаная сумка', en: 'Leather bag' },
  { uz: 'Quyosh ko`zoynagi', ru: 'Солнцезащитные очки', en: 'Sunglasses' },
  { uz: 'Yoz futbolkasi', ru: 'Летняя футболка', en: 'Summer t-shirt' },
  { uz: 'Charm kamar', ru: 'Кожаный ремень', en: 'Leather belt' },
];

const STATUSES: Array<Product['status']> = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'DRAFT', 'PENDING_REVIEW', 'OUT_OF_STOCK', 'ARCHIVED'];

export const mockProducts: Product[] = Array.from({ length: 48 }, (_, i) => {
  const name = pick(PRODUCT_NAMES, i);
  const brand = pick(mockBrands, i);
  const cat = pick(mockCategories, i);
  const stock = ((i * 13) % 220) - 10;
  const basePrice = 89_000 + ((i * 47_000) % 2_500_000);
  return {
    id: `p-${i + 1}`,
    sku: `SKU-${pad(i + 1, 6)}`,
    slug: `product-${i + 1}`,
    name,
    brandName: brand.name,
    categoryName: cat.name,
    status: stock <= 0 ? 'OUT_OF_STOCK' : pick(STATUSES, i),
    basePrice,
    compareAtPrice: i % 3 === 0 ? basePrice + 50_000 : undefined,
    currency: 'UZS',
    imageUrl: img(`product-${i}`),
    stock: Math.max(stock, 0),
    soldCount: (i * 11) % 380,
    rating: Number((3.5 + ((i * 0.13) % 1.5)).toFixed(1)),
    reviewCount: (i * 7) % 240,
    sellerName: i % 3 === 0 ? `Sotuvchi ${(i % 7) + 1}` : undefined,
    createdAt: dateAgo(i * 2),
  };
});

const ORDER_STATUSES: Order['status'][] = [
  'PENDING',
  'CONFIRMED',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'DELIVERED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
];
const PAY_STATUSES: Order['paymentStatus'][] = ['PENDING', 'PAID', 'PAID', 'PAID', 'FAILED', 'REFUNDED'];
const PAY_PROVIDERS = ['CLICK', 'PAYME', 'UZUM_BANK', 'CASH_ON_DELIVERY', 'UZCARD'];
const DELIVERY_METHODS: Order['deliveryMethod'][] = ['HOME_DELIVERY', 'PICKUP_POINT', 'EXPRESS'];

export const mockOrders: Order[] = Array.from({ length: 64 }, (_, i) => {
  const first = pick(FIRST_NAMES, i);
  const last = pick(LAST_NAMES, i + 2);
  const total = 150_000 + ((i * 87_000) % 3_900_000);
  return {
    id: `o-${i + 1}`,
    number: `ORD-2026-${pad(1230 + i)}`,
    customerName: `${first} ${last}`,
    customerPhone: `+998 90 ${String(123 + i).padStart(3, '0')} ${String(45 + i).padStart(2, '0')} ${String((i * 7) % 100).padStart(2, '0')}`,
    itemsCount: 1 + (i % 6),
    status: pick(ORDER_STATUSES, i),
    paymentStatus: pick(PAY_STATUSES, i),
    paymentProvider: pick(PAY_PROVIDERS, i),
    grandTotal: total,
    currency: 'UZS',
    placedAt: dateAgo(i * 0.3),
    deliveryMethod: pick(DELIVERY_METHODS, i),
    city: pick(CITIES, i),
  };
});

export function getOrderDetail(id: string): OrderDetail | undefined {
  const order = mockOrders.find((o) => o.id === id);
  if (!order) return undefined;
  const itemsCount = order.itemsCount;
  const items = Array.from({ length: itemsCount }, (_, i) => {
    const p = pick(mockProducts, (Number(id.split('-')[1]) ?? 0) + i);
    return {
      id: `oi-${order.id}-${i}`,
      productName: p.name,
      sku: p.sku,
      imageUrl: p.imageUrl,
      quantity: 1 + (i % 3),
      unitPrice: p.basePrice,
      totalPrice: p.basePrice * (1 + (i % 3)),
    };
  });
  const subtotal = items.reduce((sum, it) => sum + it.totalPrice, 0);
  const shipping = order.deliveryMethod === 'EXPRESS' ? 50_000 : 20_000;
  const discount = order.status === 'CANCELLED' ? 0 : (subtotal * 0.05) | 0;
  return {
    ...order,
    items,
    subtotal,
    shippingTotal: shipping,
    discountTotal: discount,
    notes: order.id === 'o-1' ? 'Iltimos, qo`shimcha qutiga joylash' : undefined,
    shippingAddress: {
      recipientName: order.customerName,
      phone: order.customerPhone,
      region: order.city + ' viloyati',
      city: order.city,
      street: `Mustaqillik ko'chasi, ${10 + (Number(id.split('-')[1]) ?? 0)}-uy`,
      landmark: '2-podyezd',
    },
    statusHistory: [
      { status: 'PENDING', changedAt: order.placedAt },
      ...(['CANCELLED', 'PENDING'].includes(order.status)
        ? []
        : [
            { status: 'CONFIRMED' as const, changedAt: dateAgo(Number(id.split('-')[1] ?? 0) * 0.3 - 0.1) },
            { status: 'PAID' as const, changedAt: dateAgo(Number(id.split('-')[1] ?? 0) * 0.3 - 0.2) },
          ]),
      { status: order.status, changedAt: dateAgo(0.05) },
    ],
  };
}

export const mockCustomers: Customer[] = Array.from({ length: 36 }, (_, i) => {
  const first = pick(FIRST_NAMES, i);
  const last = pick(LAST_NAMES, i);
  return {
    id: `cu-${i + 1}`,
    firstName: first,
    lastName: last,
    email: i % 4 !== 0 ? `${first.toLowerCase()}.${last.toLowerCase()}@mail.uz` : undefined,
    phone: `+998 90 ${String(200 + i).padStart(3, '0')} ${String(10 + i).padStart(2, '0')} ${String((i * 3) % 100).padStart(2, '0')}`,
    city: pick(CITIES, i),
    registeredAt: dateAgo(i * 4 + 5),
    ordersCount: (i * 3) % 18,
    totalSpent: 250_000 + ((i * 312_000) % 12_000_000),
    loyaltyPoints: (i * 47) % 2400,
    status: i === 5 ? 'BLOCKED' : 'ACTIVE',
    avatarUrl: i % 5 === 0 ? img(`avatar-${i}`, 100) : undefined,
  };
});

export const mockSellers: Seller[] = Array.from({ length: 14 }, (_, i) => {
  const status = (i < 3 ? 'PENDING' : i === 10 ? 'SUSPENDED' : 'ACTIVE') as Seller['status'];
  return {
    id: `s-${i + 1}`,
    legalName: `MChJ "${pick(BRANDS, i)}-Shop ${i + 1}"`,
    brandName: `${pick(BRANDS, i)} Store`,
    ownerName: `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i + 1)}`,
    email: `seller${i + 1}@example.uz`,
    phone: `+998 71 ${String(100 + i).padStart(3, '0')} ${String(20 + i).padStart(2, '0')} ${String(i).padStart(2, '0')}`,
    tin: `${300_000_000 + i * 1234}`,
    status,
    commissionRate: 8 + ((i * 0.5) % 7),
    rating: Number((3.5 + (i % 15) * 0.1).toFixed(1)),
    productsCount: (i * 17) % 240,
    ordersCount: (i * 41) % 1200,
    totalRevenue: 1_000_000 + ((i * 8_750_000) % 350_000_000),
    appliedAt: dateAgo(40 + i * 3),
    approvedAt: status === 'PENDING' ? undefined : dateAgo(30 + i * 2),
  };
});

export const mockPromoCodes: PromoCode[] = [
  { id: 'pc-1', code: 'WELCOME10', type: 'PERCENT', value: 10, minOrderTotal: 200_000, usageLimit: 1000, usedCount: 432, startsAt: dateAgo(30), endsAt: dateAgo(-60), isActive: true },
  { id: 'pc-2', code: 'NAVRUZ20', type: 'PERCENT', value: 20, minOrderTotal: 500_000, usageLimit: 500, usedCount: 500, startsAt: dateAgo(90), endsAt: dateAgo(60), isActive: false },
  { id: 'pc-3', code: 'FREESHIP', type: 'FREE_SHIPPING', value: 0, usageLimit: undefined, usedCount: 184, isActive: true },
  { id: 'pc-4', code: 'BLACK50', type: 'FIXED', value: 50_000, minOrderTotal: 300_000, usageLimit: 200, usedCount: 12, startsAt: dateAgo(-7), endsAt: dateAgo(-14), isActive: true },
];

export const mockAdminUsers: AdminUser[] = [
  { id: 'au-1', firstName: 'Akmal', lastName: 'Karimov', email: 'admin@example.uz', roles: ['SUPER_ADMIN'], lastLoginAt: dateAgo(0.04), status: 'ACTIVE', avatarUrl: img('admin-1', 100) },
  { id: 'au-2', firstName: 'Madina', lastName: 'Rasulova', email: 'madina@example.uz', roles: ['MARKETING_MANAGER'], lastLoginAt: dateAgo(1), status: 'ACTIVE' },
  { id: 'au-3', firstName: 'Bekzod', lastName: 'Aliyev', email: 'bekzod@example.uz', roles: ['FINANCE_MANAGER', 'SUPPORT_AGENT'], lastLoginAt: dateAgo(3), status: 'ACTIVE' },
  { id: 'au-4', firstName: 'Lola', lastName: 'Saidova', email: 'lola@example.uz', roles: ['SUPPORT_AGENT'], lastLoginAt: dateAgo(0.2), status: 'ACTIVE' },
];

// Daromad grafigi uchun — oxirgi 30 kun
export const mockRevenueSeries = Array.from({ length: 30 }, (_, i) => {
  const day = 29 - i;
  return {
    date: new Date(NOW - day * 86_400_000).toISOString().slice(0, 10),
    revenue: 8_000_000 + Math.round(Math.sin(i / 3) * 2_500_000 + i * 130_000),
    orders: 40 + Math.round(Math.cos(i / 4) * 12 + i * 0.8),
  };
});

// Kanal taqsimoti — kelajakda Channel hisobotidan keladi
export const mockChannelBreakdown = [
  { name: 'Web', value: 42, color: '#0ea5e9' },
  { name: 'Mobil', value: 31, color: '#8b5cf6' },
  { name: 'Telegram', value: 18, color: '#22c55e' },
  { name: 'Bot', value: 9, color: '#f59e0b' },
];
