// Admin paneli client-side auth wrapper. Cookie-based session (httpOnly).

type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

async function api<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(path, {
      method: init?.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      credentials: 'same-origin',
      ...init,
    });
    const json = (await res.json()) as ApiResult<T>;
    return json;
  } catch {
    return {
      success: false,
      error: { code: 'NETWORK', message: 'Tarmoq xatosi. Internetingizni tekshiring.' },
    };
  }
}

export interface AdminUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  status?: string;
  roles?: string[];
}

export function loginAdmin(identifier: string, password: string) {
  return api<{ user: AdminUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

export function logoutAdmin() {
  return api<{ loggedOut: true }>('/api/auth/logout', { method: 'POST' });
}

export function meAdmin() {
  return api<{ user: AdminUser }>('/api/auth/me');
}

// Sotuvchi tasdiq APIs
export function listPendingSellers() {
  return api<{ items: PendingSeller[] }>('/api/sellers/pending');
}

export function approveSeller(sellerId: string) {
  return api<{ seller: { id: string; status: string } }>(`/api/sellers/${sellerId}/approve`, {
    method: 'POST',
  });
}

export function rejectSeller(sellerId: string, reason?: string) {
  return api<{ seller: { id: string; status: string } }>(`/api/sellers/${sellerId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? null }),
  });
}

// Barcha sotuvchilar ro'yxati (status filtri bilan)
export function listSellers(status?: 'all' | 'pending' | 'active' | 'inactive') {
  const qs = status && status !== 'all' ? `?status=${status}` : '';
  return api<{ items: AdminSeller[] }>(`/api/sellers${qs}`);
}

export type SellerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';

export interface AdminSeller {
  id: string;
  brandName: string;
  legalName: string;
  ownerName: string;
  phone: string;
  status: SellerStatus;
  commissionRate: number;
  productsCount: number;
  totalRevenue: number;
  appliedAt: string;
}

// Mahsulotlar ro'yxati (admin)
export function listProducts() {
  return api<{ items: AdminProduct[] }>('/api/products');
}

type Localized = { uz: string; ru: string; en: string };

export type AdminProductStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'OUT_OF_STOCK';

export interface AdminProduct {
  id: string;
  sku: string;
  slug: string;
  name: Localized;
  brandName: string;
  categoryName: Localized;
  status: AdminProductStatus;
  basePrice: number;
  compareAtPrice?: number;
  imageUrl: string;
  stock: number;
  soldCount: number;
  rating: number;
  reviewCount: number;
  sellerName?: string;
  createdAt: string;
}

// Mijozlar ro'yxati (admin)
export function listCustomers() {
  return api<{ items: AdminCustomer[] }>('/api/customers');
}

export interface AdminCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  avatarUrl: string | null;
  city: string | null;
  status: 'ACTIVE' | 'PENDING' | 'BLOCKED' | 'DELETED';
  ordersCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  registeredAt: string;
}

// Buyurtmalar ro'yxati (admin)
export function listOrders(status?: string) {
  const qs = status && status !== 'all' ? `?status=${status}` : '';
  return api<{ items: AdminOrder[] }>(`/api/orders${qs}`);
}

export type AdminOrderStatus =
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

export type AdminPaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PAID'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'FAILED'
  | 'CANCELLED';

export interface AdminOrder {
  id: string;
  number: string;
  customerName: string;
  customerPhone: string;
  status: AdminOrderStatus;
  paymentStatus: AdminPaymentStatus;
  paymentProvider: string;
  grandTotal: number;
  itemCount: number;
  deliveryMethod: string;
  city: string;
  placedAt: string;
}

export interface PendingSeller {
  id: string;
  legalName: string;
  brandName: string;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: string;
  owner: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    status: string;
  };
}
