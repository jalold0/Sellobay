// Mock data tiplari — Prisma sxemasi ko'rinishini takrorlaydi.
// Backend tayyor bo'lsa shu tiplar @ecom/types ichidan keladi.

export type LocalizedText = { uz: string; ru?: string; en?: string };

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAID'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'REFUNDED';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PAID'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'FAILED'
  | 'CANCELLED';

export type ProductStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'OUT_OF_STOCK';

export type SellerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';

export interface Product {
  id: string;
  sku: string;
  slug: string;
  name: LocalizedText;
  brandName: string;
  categoryName: LocalizedText;
  status: ProductStatus;
  basePrice: number;
  compareAtPrice?: number;
  currency: 'UZS';
  imageUrl: string;
  stock: number;
  soldCount: number;
  rating: number;
  reviewCount: number;
  sellerName?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  number: string;
  customerName: string;
  customerPhone: string;
  itemsCount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentProvider: string;
  grandTotal: number;
  currency: 'UZS';
  placedAt: string;
  deliveryMethod: 'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS';
  city: string;
}

export interface OrderDetail extends Order {
  items: Array<{
    id: string;
    productName: LocalizedText;
    sku: string;
    imageUrl: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  shippingAddress: {
    recipientName: string;
    phone: string;
    region: string;
    city: string;
    street: string;
    landmark?: string;
  };
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  notes?: string;
  statusHistory: Array<{
    status: OrderStatus;
    changedAt: string;
    comment?: string;
  }>;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  city?: string;
  registeredAt: string;
  ordersCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  status: 'ACTIVE' | 'BLOCKED' | 'PENDING';
  avatarUrl?: string;
}

export interface Seller {
  id: string;
  legalName: string;
  brandName: string;
  ownerName: string;
  email?: string;
  phone?: string;
  tin?: string;
  status: SellerStatus;
  commissionRate: number;
  rating: number;
  productsCount: number;
  ordersCount: number;
  totalRevenue: number;
  appliedAt: string;
  approvedAt?: string;
}

export interface Category {
  id: string;
  parentId?: string;
  slug: string;
  name: LocalizedText;
  isActive: boolean;
  position: number;
  productCount: number;
  children?: Category[];
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED' | 'FREE_SHIPPING' | 'BXGY';
  value: number;
  minOrderTotal?: number;
  usageLimit?: number;
  usedCount: number;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  lastLoginAt?: string;
  status: 'ACTIVE' | 'BLOCKED';
  avatarUrl?: string;
}

export interface Brand {
  id: string;
  slug: string;
  name: string;
  productCount: number;
  isActive: boolean;
}
