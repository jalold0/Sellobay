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

// Mahsulot moderatsiyasi: approve → ACTIVE, reject → DRAFT (faqat PENDING_REVIEW)
export function moderateProduct(id: string, action: 'approve' | 'reject') {
  return api<{ product: { id: string; status: string } }>(`/api/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });
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

// Fulfillment kanonik tartibi — status faqat OLDINGA suriladi (backend ham shuni tekshiradi).
const FULFILLMENT_FLOW: AdminOrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

/** Berilgan statusdan keyin qo'yish mumkin bo'lgan (oldingi) statuslar. Flow'da bo'lmasa (masalan
 *  CANCELLED/RETURNED) — bo'sh (bu endpoint orqali o'zgartirib bo'lmaydi). */
export function forwardStatuses(current: string): AdminOrderStatus[] {
  const i = FULFILLMENT_FLOW.indexOf(current as AdminOrderStatus);
  return i === -1 ? [] : FULFILLMENT_FLOW.slice(i + 1);
}

export interface OrderStatusUpdateResult {
  id: string;
  number: string;
  status: AdminOrderStatus;
  codSettled: boolean;
  soldCountItems: number;
}

/** Buyurtma statusini oldinga suradi (admin fulfillment). DELIVERED'da COD to'lov PAID + soldCount. */
export function updateOrderStatus(id: string, status: AdminOrderStatus, comment?: string) {
  return api<OrderStatusUpdateResult>(`/api/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, comment }),
  });
}

// Karta orqali qo'lda to'lov — tasdiqlashni kutayotgan buyurtmalar
export interface PaymentReviewItem {
  paymentId: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  amount: number;
  grandTotal: number;
  customerName: string;
  customerPhone: string;
  city: string;
  itemCount: number;
  note: string | null;
  receipt: string; // data-URL rasm
  placedAt: string;
  createdAt: string;
}

export function listPaymentReview() {
  return api<{ items: PaymentReviewItem[] }>('/api/orders/payment-review');
}

// Buyurtma to'liq tafsiloti (admin detal sahifasi uchun)
interface LocalizedText {
  uz?: string;
  ru?: string;
  en?: string;
}
export interface AdminOrderDetail {
  id: string;
  number: string;
  status: AdminOrderStatus;
  customerName: string;
  customerPhone: string;
  paymentStatus: AdminPaymentStatus;
  paymentProvider: string;
  subtotal: number;
  shippingTotal: number;
  discountTotal: number;
  grandTotal: number;
  placedAt: string;
  deliveryMethod: 'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS';
  city: string;
  notes?: string;
  shippingAddress: {
    recipientName: string;
    phone: string;
    region: string;
    city: string;
    street: string;
    landmark?: string;
  } | null;
  items: Array<{
    id: string;
    productName: LocalizedText | string;
    sku: string;
    imageUrl: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  statusHistory: Array<{ status: AdminOrderStatus; changedAt: string; comment?: string }>;
  manualCard: { pending: boolean; receipt: string; note: string | null } | null;
}

export function getOrderDetail(id: string) {
  return api<AdminOrderDetail>(`/api/orders/${id}`);
}

/** Karta to'lovini tasdiqlash (verify → PAID) yoki rad etish (reject → FAILED). */
export function reviewPayment(orderId: string, action: 'verify' | 'reject', comment?: string) {
  return api<{ orderId: string; orderStatus: string; paymentStatus: string }>(
    `/api/orders/${orderId}/payment`,
    { method: 'PATCH', body: JSON.stringify({ action, comment }) },
  );
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

// ─── Bosh sahifa ko'rsatkichlari ──────────────────────────────────
// Barcha qiymat bazadan keladi (/api/dashboard). `deltaPercent` null bo'lishi
// mumkin: oldingi davr nolga teng bo'lsa foiz hisoblab bo'lmaydi va uni
// ko'rsatmaslik kerak.

export interface DashboardMetric {
  current: number;
  deltaPercent: number | null;
  allTime: number;
}

export interface DashboardData {
  windowDays: number;
  revenue: DashboardMetric;
  orders: DashboardMetric;
  customers: DashboardMetric;
  averageOrderValue: DashboardMetric;
  dailySeries: { date: string; revenue: number; orders: number }[];
  deliveryBreakdown: { method: string; count: number }[];
  recentOrders: {
    id: string;
    number: string;
    status: AdminOrderStatus;
    grandTotal: number;
    placedAt: string;
    itemsCount: number;
    customerName: string;
  }[];
  lowStock: { id: string; sku: string; name: Localized; imageUrl: string; stock: number }[];
  topProducts: { id: string; name: Localized; brandName: string; soldCount: number }[];
}

export function fetchDashboard() {
  return api<DashboardData>('/api/dashboard');
}
