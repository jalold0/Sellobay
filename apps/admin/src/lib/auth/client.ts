// Admin paneli client-side auth wrapper. Cookie-based session (httpOnly).

type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

async function api<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const send = () =>
      fetch(path, {
        method: init?.method ?? 'GET',
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
        credentials: 'same-origin',
        ...init,
      });
    let res = await send();
    // Access token tugagan (15 daqiqa) — sessiyani yangilab, so'rovni bir marta takrorlaymiz.
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      const refreshed = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (refreshed.ok) res = await send();
    }
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

/** Admin o'z profilini yangilaydi (PATCH /api/auth/me allaqachon mavjud edi,
 *  lekin sozlamalar sahifasi uni chaqirmasdi — faqat "Saqlandi" deb yozardi). */
export function updateAdminProfile(input: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  return api<{ user: AdminUser }>('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
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

/** O'z parolini almashtirish; boshqa qurilmalardagi sessiyalar yopiladi. */
export function changeAdminPassword(currentPassword: string, newPassword: string) {
  return api<{ changed: true; otherSessionsSignedOut: number }>('/api/auth/password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function rejectSeller(sellerId: string, reason: string) {
  return api<{ seller: { id: string; status: string } }>(`/api/sellers/${sellerId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

/** Faol sotuvchini to'xtatish yoki to'xtatilganini qayta yoqish (sabab jurnalga yoziladi). */
export function setSellerStatus(
  sellerId: string,
  action: 'suspend' | 'reactivate',
  reason?: string,
) {
  return api<{ seller: { id: string; status: string } }>(`/api/sellers/${sellerId}/status`, {
    method: 'POST',
    body: JSON.stringify({ action, reason }),
  });
}

/** Sotuvchining ishlash modeli (FBS/FBO, ADR 0015); `applyToProducts` — mavjud tovarlari ham. */
export function setSellerFulfillment(
  sellerId: string,
  model: 'FBS' | 'FBO',
  applyToProducts: boolean,
) {
  return api<{ seller: { id: string; fulfillmentModel: 'FBS' | 'FBO' }; productsMoved: number }>(
    `/api/sellers/${sellerId}/fulfillment`,
    { method: 'POST', body: JSON.stringify({ model, applyToProducts }) },
  );
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
  /** Yangi tovarlar shu model bilan yaratiladi (ADR 0015). */
  fulfillmentModel: 'FBS' | 'FBO';
  /** Mavjud tovarlar modellar bo'yicha. */
  productsByModel: { FBS: number; FBO: number };
}

// Mahsulotlar ro'yxati (admin)
export function listProducts() {
  return api<{ items: AdminProduct[] }>('/api/products');
}

// Mahsulot moderatsiyasi: approve → ACTIVE, reject → DRAFT (faqat PENDING_REVIEW)
/** Moderatsiya: tasdiqlash, rad etish (sabab majburiy) yoki sotuvdan olish (sabab majburiy). */
export function moderateProduct(
  id: string,
  action: 'approve' | 'reject' | 'takedown',
  reason?: string,
) {
  return api<{ product: { id: string; status: string } }>(`/api/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action, reason }),
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

export interface AdminCustomerOrder {
  id: string;
  number: string;
  status: AdminOrderStatus;
  grandTotal: number;
  placedAt: string;
}

/** Bitta mijoz kartochkasi + oxirgi buyurtmalari. */
export function getCustomer(id: string) {
  return api<{ customer: AdminCustomer; orders: AdminCustomerOrder[] }>(`/api/customers/${id}`);
}

// ── Dashboard statistikasi ────────────────────────────────────────

/** Mahsulot nomi — DB'da Json, shakli { uz, ru?, en? }. */
export type LocalizedName = Partial<Record<'uz' | 'ru' | 'en', string>>;
export interface AdminStats {
  kpi: {
    revenue: number;
    revenuePrev: number;
    /** Foiz o'zgarish; oldingi davrda daromad bo'lmasa `null`. */
    revenueDelta: number | null;
    ordersCount: number;
    ordersPrev: number;
    newCustomers: number;
    avgCheck: number;
    /** Takroriy xarid ulushi (%); xaridor bo'lmasa `null`. */
    repeatRate: number | null;
    buyers: number;
    windowDays: number;
  };
  revenueSeries: Array<{ date: string; revenue: number; orders: number }>;
  lowStock: Array<{
    id: string;
    name: LocalizedName;
    sku: string;
    imageUrl: string;
    stock: number;
  }>;
  recentOrders: Array<{
    id: string;
    number: string;
    status: AdminOrderStatus;
    grandTotal: number;
    placedAt: string;
    customerName: string;
  }>;
  topProducts: Array<{
    id: string;
    name: LocalizedName;
    sku: string;
    brandName: string | null;
    soldCount: number;
    basePrice: number;
    imageUrl: string;
  }>;
}

export function getStats() {
  return api<AdminStats>('/api/stats');
}

// ── Brendlar ──────────────────────────────────────────────────────
export interface AdminBrand {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  isActive: boolean;
  productsCount: number;
  createdAt: string;
}

export function listBrands() {
  return api<{ items: AdminBrand[] }>('/api/brands');
}

export function createBrand(input: { name: string; slug?: string; logoUrl?: string | null }) {
  return api<{ brand: AdminBrand }>('/api/brands', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ── Kategoriyalar ─────────────────────────────────────────────────
export interface AdminCategory {
  id: string;
  parentId: string | null;
  slug: string;
  name: LocalizedName;
  iconUrl: string | null;
  position: number;
  isActive: boolean;
  productsCount: number;
  childrenCount: number;
}

export function listCategories() {
  return api<{ items: AdminCategory[] }>('/api/categories');
}

export function createCategory(input: {
  name: { uz: string; ru?: string; en?: string };
  slug?: string;
  parentId?: string | null;
}) {
  return api<{ category: AdminCategory }>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ── Promokodlar ───────────────────────────────────────────────────
export type AdminPromoType = 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';

export interface AdminPromoCode {
  id: string;
  code: string;
  type: AdminPromoType;
  value: number;
  minOrderTotal: number | null;
  maxDiscount: number | null;
  usageLimit: number | null;
  usagePerUser: number;
  usedCount: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
}

export function listPromoCodes() {
  return api<{ items: AdminPromoCode[] }>('/api/promo-codes');
}

export function createPromoCode(input: {
  code: string;
  type: AdminPromoType;
  value: number;
  minOrderTotal?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  usagePerUser?: number;
  endsAt?: string | null;
}) {
  return api<{ promo: AdminPromoCode }>('/api/promo-codes', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ── Ombor (faqat o'qish; zaxirani sotuvchi boshqaradi) ────────────
export interface AdminInventoryRow {
  id: string;
  sku: string;
  name: LocalizedName;
  status: string;
  basePrice: number;
  imageUrl: string;
  sellerName: string | null;
  stock: number;
  reserved: number;
}

export interface AdminInventorySummary {
  totalStock: number;
  inventoryValue: number;
  lowStock: number;
  outOfStock: number;
  threshold: number;
}

export function listInventory() {
  return api<{ items: AdminInventoryRow[]; summary: AdminInventorySummary }>('/api/inventory');
}

// Buyurtmalar ro'yxati (admin)
export function listOrders(status?: string) {
  const qs = status && status !== 'all' ? `?status=${status}` : '';
  return api<{ items: AdminOrder[] }>(`/api/orders${qs}`);
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

export type RefundMethod = 'GATEWAY' | 'CARD_TRANSFER' | 'CASH';

/** Mijozga qaytarilgan pulni qayd etish (pulning o'zi qo'lda qaytariladi). */
export function recordRefund(
  id: string,
  input: { amount: string; method: RefundMethod; reference?: string; note?: string },
) {
  return api<{ id: string; refundedTotal: string; fullyRefunded: boolean; status: string }>(
    `/api/orders/${id}/refund`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export interface PendingRefundItem {
  id: string;
  number: string;
  status: 'CANCELLED' | 'RETURNED';
  remaining: string;
  refundedTotal: string;
  provider: string | null;
  customerName: string | null;
  customerPhone: string | null;
  updatedAt: string;
}

export function listPendingRefunds() {
  return api<{ items: PendingRefundItem[] }>('/api/refunds');
}

/** Buyurtmani bekor qilish (tovar hali omborda). To'langan bo'lsa `refundRequired: true`. */
export function cancelOrder(id: string, reason: string) {
  return api<{ id: string; number: string; status: 'CANCELLED'; refundRequired: boolean }>(
    `/api/orders/${id}/cancel`,
    { method: 'POST', body: JSON.stringify({ reason }) },
  );
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
  /** Server hisoblagan keyingi statuslar (to'lov holatini hisobga olib). Bo'sh — o'zgartirib bo'lmaydi. */
  allowedNextStatuses: AdminOrderStatus[];
  /** Tovar hali omborda — admin bekor qila oladi. */
  canCancel: boolean;
  /** Pul qaytarish holati (o'nlik satrlar). `remaining` "0.00" bo'lsa qaytariladigan pul yo'q. */
  refund: { refundedTotal: string; remaining: string };
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
  /** Sotuvchi jo'natmalari (ADR 0015). */
  shipments: Array<{
    id: string;
    model: 'FBS' | 'FBO';
    status: 'NEW' | 'ACCEPTED' | 'PACKED' | 'HANDED_OVER' | 'CANCELLED';
    deadlineAt: string;
    sellerName: string | null;
    itemCount: number;
  }>;
  manualCard: { pending: boolean; receipt: string; note: string | null } | null;
}

export function getOrderDetail(id: string) {
  return api<AdminOrderDetail>(`/api/orders/${id}`);
}

/**
 * Karta to'lovini tasdiqlash (verify → PAID) yoki rad etish (reject → FAILED).
 * `receivedAmount` — admin chekda ko'rgan summa (so'm, satr); verify'da MAJBURIY.
 */
export function reviewPayment(
  orderId: string,
  action: 'verify' | 'reject',
  opts: { comment?: string; receivedAmount?: string } = {},
) {
  return api<{ orderId: string; orderStatus: string; paymentStatus: string }>(
    `/api/orders/${orderId}/payment`,
    { method: 'PATCH', body: JSON.stringify({ action, ...opts }) },
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
  /** Server hisoblagan keyingi statuslar (to'lov holatini hisobga olib). Bo'sh — o'zgartirib bo'lmaydi. */
  allowedNextStatuses: AdminOrderStatus[];
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
  tin: string | null;
  registrationNo: string | null;
  bankName: string | null;
  bankAccount: string | null;
  owner: {
    id: string;
    email: string | null;
    phone: string | null;
    firstName: string | null;
    lastName: string | null;
    status: string;
  };
}

// ── Guruh xaridi ──────────────────────────────────────────────────
export interface AdminGroupBuy {
  id: string;
  productId: string;
  productSlug: string;
  name: LocalizedName;
  imageUrl: string;
  soloPrice: number;
  groupPrice: number;
  targetSize: number;
  currentSize: number;
  status: 'OPEN' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
  expiresAt: string;
  completedAt: string | null;
  createdAt: string;
}

export function listGroupBuys() {
  return api<{ items: AdminGroupBuy[] }>('/api/group-buy');
}

export function createGroupBuy(input: {
  productId: string;
  groupPrice: number;
  targetSize: number;
  durationDays: number;
}) {
  return api<{ groupBuy: { id: string; expiresAt: string } }>('/api/group-buy', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function cancelGroupBuy(id: string) {
  return api<{ id: string; status: string; affectedMembers: number }>(`/api/group-buy/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ action: 'cancel' }),
  });
}

/** Admin orqali mahsulot yaratish (platforma mahsuloti — sellerId null). */
export function createProduct(input: {
  nameUz: string;
  nameRu?: string;
  nameEn?: string;
  descriptionUz?: string;
  sku: string;
  slug?: string;
  basePrice: number;
  compareAtPrice?: number | null;
  stock: number;
  weightGrams?: number | null;
  categoryId: string;
  brandId?: string | null;
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE';
}) {
  return api<{ product: { id: string; slug: string; sku: string; status: string } }>(
    '/api/products/create',
    { method: 'POST', body: JSON.stringify(input) },
  );
}

// ── Panel xodimlari ───────────────────────────────────────────────
export interface AdminStaffUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: string;
  roles: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

export function listAdminUsers() {
  return api<{ items: AdminStaffUser[] }>('/api/admin-users');
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

// --- Qaytarishlar: kuryerga topshiriq ochish -------------------------------
//
// Mijoz qaytarishni so'raganda buyurtma `RETURNED` bo'ladi, lekin mahsulot
// hali mijozda turadi. Kuryer topshirig'i AVTOMATIK ochilmaydi — asossiz
// so'rov ham kuryerni yo'lga chiqarardi. Admin shu ro'yxatda ko'rib,
// tasdiqlaydi.

export interface ReturnLocalizedText {
  uz?: string;
  ru?: string;
  en?: string;
}

export interface PendingReturnItem {
  id: string;
  number: string;
  grandTotal: string;
  returnedAt: string;
  itemCount: number;
  items: Array<{ id: string; quantity: number; nameSnapshot: ReturnLocalizedText }>;
  recipientName: string | null;
  recipientPhone: string | null;
}

export function listPendingReturns() {
  return api<{ items: PendingReturnItem[] }>('/api/returns');
}

/**
 * Qaytarishni tasdiqlaydi: kuryerga topshiriq(lar) ochiladi.
 *
 * Bir nechta bo'lishi mumkin — buyurtmadagi mahsulotlar har xil
 * sotuvchiga tegishli bo'lsa, har bir ombor uchun alohida topshiriq.
 */
export function dispatchReturn(orderId: string) {
  return api<{ created: number; deliveryIds: string[]; alreadyExisted: boolean }>(
    `/api/returns/${orderId}/dispatch`,
    { method: 'POST' },
  );
}

/** Mijoz tovarni o'zi olib keldi — admin qabul qiladi, zaxira shu paytda qaytadi. */
export function receiveReturn(orderId: string) {
  return api<{ deliveryId: string; stockRestocked: number }>(`/api/returns/${orderId}/receive`, {
    method: 'POST',
  });
}
