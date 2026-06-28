// Sellobay mobil — jonli API client
// Web bilan BIR XIL backend: sellobay-web.vercel.app/api (Neon PostgreSQL)
// Internet/DB muammosi bo'lsa — mock fallback (ilova hech qachon yiqilmaydi).

import Constants from 'expo-constants';

import { products as mockProducts, type MockProduct, type LocalizedText } from './mock-data';
import { secureStorage, STORAGE_KEYS } from './storage';

/** Saqlangan access token'dan Authorization header (login bo'lmasa bo'sh). */
async function authHeader(): Promise<Record<string, string>> {
  const token = await secureStorage.get(STORAGE_KEYS.accessToken);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const API_BASE =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  'https://sellobay-web.vercel.app';

// ─── API javob turlari ───────────────────────────────────────────

interface ApiProduct {
  id: string;
  slug: string;
  sku: string;
  name: LocalizedText;
  price: string; // Decimal → string
  oldPrice: string | null;
  currency: string;
  rating: number;
  reviewCount: number;
  soldCount: number;
  isFeatured: boolean;
  brand: { id: string; slug: string; name: string } | null;
  imageUrl: string | null;
  category: { slug: string; name: LocalizedText } | null;
}

interface ProductsResponse {
  items: ApiProduct[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── ApiProduct → MockProduct adapter (ekranlar shu shape'da) ────

const PICSUM_SEED_RE = /picsum\.photos\/seed\/([^/]+)\//;

function deriveBadge(p: ApiProduct): MockProduct['badge'] {
  if (p.oldPrice) return 'SALE';
  if (p.rating >= 4.7 && p.reviewCount >= 100) return 'TOP';
  if (p.isFeatured) return 'NEW';
  return undefined;
}

function toMockProduct(p: ApiProduct): MockProduct {
  const seedMatch = p.imageUrl ? PICSUM_SEED_RE.exec(p.imageUrl) : null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand?.name ?? 'Sellobay',
    brandId: p.brand?.slug ?? '',
    categoryId: p.category?.slug ?? '',
    price: Number(p.price),
    oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
    currency: 'UZS',
    rating: p.rating,
    reviewCount: p.reviewCount,
    imageSeed: seedMatch?.[1] ?? p.slug,
    badge: deriveBadge(p),
    inStock: true,
  };
}

// ─── Public API funksiyalari ─────────────────────────────────────

export interface FetchProductsParams {
  category?: string;
  brand?: string;
  q?: string;
  sort?: string;
  featured?: boolean;
  limit?: number;
}

const TIMEOUT_MS = 12_000;

async function getJson<T>(path: string): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Mahsulotlar ro'yxati — DB'dan, xato bo'lsa mock fallback. */
export async function fetchProducts(params: FetchProductsParams = {}): Promise<MockProduct[]> {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.brand) qs.set('brand', params.brand);
  if (params.q) qs.set('q', params.q);
  if (params.sort) qs.set('sort', params.sort);
  if (params.featured) qs.set('featured', 'true');
  qs.set('limit', String(params.limit ?? 48));

  try {
    const data = await getJson<ProductsResponse>(`/api/products?${qs.toString()}`);
    if (!data.items?.length) return filterMock(params);
    return data.items.map(toMockProduct);
  } catch (err) {
    console.warn('[api] fetchProducts fallback → mock:', String(err));
    return filterMock(params);
  }
}

/** Bitta mahsulot — slug bo'yicha. */
export async function fetchProduct(slug: string): Promise<MockProduct | null> {
  try {
    const p = await getJson<ApiProduct & { description?: LocalizedText }>(`/api/products/${slug}`);
    return toMockProduct(p);
  } catch (err) {
    console.warn('[api] fetchProduct fallback → mock:', String(err));
    return mockProducts.find((p) => p.slug === slug) ?? null;
  }
}

// ─── Mock fallback (DB'siz rejim) ────────────────────────────────

function filterMock(params: FetchProductsParams): MockProduct[] {
  let list = mockProducts.slice();
  if (params.featured) list = list.filter((p) => p.badge === 'TOP' || p.badge === 'SALE');
  if (params.q) {
    const q = params.q.toLowerCase();
    list = list.filter(
      (p) =>
        Object.values(p.name).some((n) => n.toLowerCase().includes(q)) ||
        p.brand.toLowerCase().includes(q),
    );
  }
  switch (params.sort) {
    case 'price-asc':
      list.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      list.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      list.sort((a, b) => b.rating - a.rating);
      break;
    default:
      list.sort((a, b) => b.reviewCount - a.reviewCount);
  }
  return list.slice(0, params.limit ?? 48);
}

// ─── Buyurtma yaratish ──────────────────────────────────────────

export interface CreateOrderInput {
  items: Array<{ productId: string; quantity: number; variantId?: string }>;
  recipientName: string;
  phone: string;
  region?: string;
  city: string;
  street: string;
  apartment?: string;
  deliveryMethod: 'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS';
  paymentProvider: 'CLICK' | 'PAYME' | 'UZUM_BANK' | 'UZCARD' | 'HUMO' | 'CASH_ON_DELIVERY';
  notes?: string;
  redeemCoins?: number;
}

export interface CreateOrderResult {
  success: boolean;
  order?: { id: string; number: string; status: string; grandTotal: string };
  error?: { code: string; message: string };
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(await authHeader()),
        },
        body: JSON.stringify(input),
      });
    } finally {
      clearTimeout(timer);
    }
    const json = (await res.json()) as {
      success: boolean;
      data?: { order: { id: string; number: string; status: string; grandTotal: string } };
      error?: { code: string; message: string };
    };
    if (!json.success || !json.data) {
      return {
        success: false,
        error: json.error ?? { code: 'UNKNOWN', message: 'Buyurtma yaratilmadi' },
      };
    }
    return { success: true, order: json.data.order };
  } catch (err) {
    return {
      success: false,
      error: { code: 'NETWORK', message: `Tarmoq xatosi: ${String(err)}` },
    };
  }
}

// ─── Auth (login → token) ────────────────────────────────────────

export interface AuthUser {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface LoginResult {
  success: boolean;
  user?: AuthUser;
  tokens?: { access: string; refresh: string };
  error?: { code: string; message: string };
}

/** Email/telefon + parol bilan kirish — token'larni body'dan oladi (mobile uchun). */
export async function loginWithPassword(
  identifier: string,
  password: string,
): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const json = (await res.json()) as {
      success: boolean;
      data?: { user: AuthUser; tokens: { access: string; refresh: string } };
      error?: { code: string; message: string };
    };
    if (!json.success || !json.data) {
      return {
        success: false,
        error: json.error ?? { code: 'UNKNOWN', message: 'Kirish amalga oshmadi' },
      };
    }
    return { success: true, user: json.data.user, tokens: json.data.tokens };
  } catch (err) {
    return { success: false, error: { code: 'NETWORK', message: `Tarmoq xatosi: ${String(err)}` } };
  }
}

/** OTP kod yuborish (telefon). */
export async function sendOtp(
  phone: string,
): Promise<{ success: boolean; error?: { message: string } }> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const json = (await res.json()) as { success: boolean; error?: { message: string } };
    return json;
  } catch (err) {
    return { success: false, error: { message: `Tarmoq xatosi: ${String(err)}` } };
  }
}

/** OTP kodni tasdiqlash → token'lar (mobile uchun body'da). */
export async function verifyOtp(
  phone: string,
  code: string,
  firstName?: string,
): Promise<LoginResult> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ phone, code, firstName }),
    });
    const json = (await res.json()) as {
      success: boolean;
      data?: { user: AuthUser; tokens: { access: string; refresh: string } };
      error?: { code: string; message: string };
    };
    if (!json.success || !json.data) {
      return {
        success: false,
        error: json.error ?? { code: 'UNKNOWN', message: 'Tasdiqlash amalga oshmadi' },
      };
    }
    return { success: true, user: json.data.user, tokens: json.data.tokens };
  } catch (err) {
    return { success: false, error: { code: 'NETWORK', message: `Tarmoq xatosi: ${String(err)}` } };
  }
}

// ─── Sello Coins (loyalty) ───────────────────────────────────────

export interface LoyaltyData {
  coins: number;
  spentSom: number;
  history: Array<{ id: string; type: string; amount: number; reasonKey: string; daysAgo: number }>;
  checkedInToday?: boolean;
}

/** Joriy user loyalty balansi — login bo'lsa real, aks holda null (chaqiruvchi mock'ga tushadi). */
export async function fetchLoyalty(): Promise<LoyaltyData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/loyalty`, {
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data?: LoyaltyData };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

export interface CheckinResult {
  alreadyClaimed: boolean;
  awarded: number;
  balance: number;
}

/** Kunlik check-in — +5 coin (kuniga 1 marta). Login kerak; null = mock rejim. */
export async function checkinDaily(): Promise<CheckinResult | null> {
  try {
    const res = await fetch(`${API_BASE}/api/loyalty/checkin`, {
      method: 'POST',
      headers: { Accept: 'application/json', ...(await authHeader()) },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data?: CheckinResult };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

// ─── Authdan o'tgan so'rovlar uchun yordamchi ──────────────────────

async function authedJson<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: init?.method ?? 'GET',
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(await authHeader()),
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data?: T };
    return json.success && json.data !== undefined ? json.data : null;
  } catch (err) {
    console.warn('[api] authedJson xato:', path, String(err));
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Buyurtmalar ─────────────────────────────────────────────────

export interface ApiOrder {
  id: string;
  number: string;
  status: string;
  grandTotal: string;
  placedAt: string;
  deliveryMethod: string;
  itemCount: number;
  items: Array<{
    id: string;
    quantity: number;
    nameSnapshot: LocalizedText | string;
    totalPrice: string;
  }>;
}

/** Joriy user buyurtmalari. Login kerak; null = login emas yoki xato. */
export async function fetchOrders(): Promise<ApiOrder[] | null> {
  const data = await authedJson<{ items: ApiOrder[] }>('/api/orders');
  return data?.items ?? null;
}

// ─── Manzillar (CRUD) ────────────────────────────────────────────

export interface ApiAddress {
  id: string;
  label: string | null;
  type: 'HOME' | 'WORK' | 'PICKUP' | 'OTHER';
  recipientName: string;
  phone: string;
  region: string;
  city: string;
  district: string | null;
  street: string;
  building: string | null;
  apartment: string | null;
  landmark: string | null;
  isDefault: boolean;
}

export interface AddressInput {
  label?: string | null;
  type: ApiAddress['type'];
  recipientName: string;
  phone: string;
  region?: string;
  city: string;
  street: string;
  apartment?: string | null;
  landmark?: string | null;
  isDefault?: boolean;
}

export async function fetchAddresses(): Promise<ApiAddress[] | null> {
  const data = await authedJson<{ items: ApiAddress[] }>('/api/addresses');
  return data?.items ?? null;
}

export async function createAddress(input: AddressInput): Promise<ApiAddress | null> {
  const data = await authedJson<{ address: ApiAddress }>('/api/addresses', {
    method: 'POST',
    body: input,
  });
  return data?.address ?? null;
}

export async function setDefaultAddress(id: string): Promise<boolean> {
  const data = await authedJson<{ address: ApiAddress }>(`/api/addresses/${id}`, {
    method: 'PATCH',
    body: { isDefault: true },
  });
  return data !== null;
}

export async function deleteAddress(id: string): Promise<boolean> {
  const data = await authedJson<unknown>(`/api/addresses/${id}`, { method: 'DELETE' });
  return data !== null;
}

// ─── Saqlangan to'lov usullari ───────────────────────────────────

export interface ApiPaymentMethod {
  id: string;
  provider: string;
  brand: string | null;
  last4: string | null;
  expiryMonth: number | null;
  expiryYear: number | null;
  isDefault: boolean;
}

export async function fetchPaymentMethods(): Promise<ApiPaymentMethod[] | null> {
  const data = await authedJson<{ items: ApiPaymentMethod[] }>('/api/payment-methods');
  return data?.items ?? null;
}

export async function deletePaymentMethod(id: string): Promise<boolean> {
  const data = await authedJson<unknown>(`/api/payment-methods/${id}`, { method: 'DELETE' });
  return data !== null;
}

// ─── Profil (shaxsiy ma'lumotlar) ────────────────────────────────

export interface MeUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED' | null;
  birthDate?: string | null;
  locale?: 'uz' | 'ru' | 'en' | null;
}

export interface UpdateMeInput {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED';
  birthDate?: string | null;
}

/** Joriy foydalanuvchi to'liq profili. Login kerak; null = login emas/xato. */
export async function fetchMe(): Promise<MeUser | null> {
  const data = await authedJson<{ user: MeUser }>('/api/auth/me');
  return data?.user ?? null;
}

export interface UpdateMeResult {
  success: boolean;
  user?: MeUser;
  error?: { code: string; message: string };
}

/** Profilni yangilash (PATCH /api/auth/me). Band email/telefon xatosini ham qaytaradi. */
export async function updateMe(input: UpdateMeInput): Promise<UpdateMeResult> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(await authHeader()),
      },
      body: JSON.stringify(input),
    });
    const json = (await res.json()) as {
      success: boolean;
      data?: { user: MeUser };
      error?: { code: string; message: string };
    };
    if (!json.success || !json.data) {
      return { success: false, error: json.error ?? { code: 'UNKNOWN', message: 'Saqlanmadi' } };
    }
    return { success: true, user: json.data.user };
  } catch (err) {
    return { success: false, error: { code: 'NETWORK', message: `Tarmoq xatosi: ${String(err)}` } };
  }
}

export { API_BASE };
