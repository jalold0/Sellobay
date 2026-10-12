// Sotuvchi paneli client-side auth wrapper. Cookie-based session (httpOnly).

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

export interface SellerUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  status?: string;
  roles?: string[];
}

export function loginSeller(identifier: string, password: string) {
  return api<{ user: SellerUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

export function logoutSeller() {
  return api<{ loggedOut: true }>('/api/auth/logout', { method: 'POST' });
}

export interface SellerShop {
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  brandName: string;
  suspendReason: string | null;
}

export function meSeller() {
  return api<{ user: SellerUser; seller: SellerShop | null }>('/api/auth/me');
}

/** Mahsulot nomi — DB'da Json, shakli { uz, ru?, en? }. */
export type LocalizedName = Partial<Record<'uz' | 'ru' | 'en', string>>;

/** Inventar qatori — HAR VARIANT alohida (bir variantli tovarda `variantLabel` = null). */
export interface InventoryRow {
  variantId: string;
  productId: string;
  sku: string;
  name: LocalizedName;
  variantLabel: string | null;
  price: number;
  imageUrl: string;
  stock: number;
  reserved: number;
  /** Shundan kam qolsa «kam qoldi» deb belgilanadi. */
  reorderPoint: number;
}

export function listInventory() {
  return api<{ items: InventoryRow[] }>('/api/inventory');
}

/**
 * Zaxirani yangilaydi. `quantity` — yakuniy son, `expected` — sahifada ko'rilgan son:
 * shu orada buyurtma tushib o'zgargan bo'lsa server 409 STOCK_CHANGED qaytaradi.
 */
export function updateInventory(
  updates: Array<{ variantId: string; quantity: number; expected: number }>,
) {
  return api<{ updated: number }>('/api/inventory', {
    method: 'PATCH',
    body: JSON.stringify({ updates }),
  });
}

// ── Sotuvchi statistikasi (analitika + moliya) ────────────────────
export interface SellerStats {
  kpi: {
    revenue: number;
    revenuePrev: number;
    ordersCount: number;
    ordersPrev: number;
    avgCheck: number;
    /** Sharhlar bo'yicha vaznli o'rtacha; sharh bo'lmasa `null`. */
    rating: number | null;
    reviewCount: number;
    windowDays: number;
  };
  revenueSeries: Array<{ date: string; revenue: number; orders: number }>;
  topProducts: Array<{
    id: string;
    sku: string;
    name: LocalizedName;
    soldCount: number;
    basePrice: number;
    rating: number;
    reviewCount: number;
    imageUrl: string;
  }>;
  finance: {
    commissionRate: number;
    periodGross: number;
    periodCommission: number;
    periodNet: number;
    payouts: Array<{
      id: string;
      amount: number;
      currency: string;
      periodStart: string;
      periodEnd: string;
      status: string;
      paidAt: string | null;
      reference: string | null;
    }>;
  };
}

export function getSellerStats() {
  return api<SellerStats>('/api/stats');
}

// ── Qaytarishlar (faqat o'qish — qarang docs/adr/0008) ────────────
export interface SellerReturnRow {
  id: string;
  number: string;
  status: 'RETURNED' | 'REFUNDED';
  placedAt: string;
  returnedAt: string | null;
  reason: string | null;
  customerName: string;
  sellerAmount: number;
  items: Array<{
    id: string;
    sku: string;
    name: LocalizedName;
    quantity: number;
    totalPrice: number;
  }>;
}

export function listReturns() {
  return api<{ items: SellerReturnRow[] }>('/api/returns');
}
