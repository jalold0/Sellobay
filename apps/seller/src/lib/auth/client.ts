// Sotuvchi paneli client-side auth wrapper. Cookie-based session (httpOnly).

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

export function meSeller() {
  return api<{ user: SellerUser }>('/api/auth/me');
}

/** Mahsulot nomi — DB'da Json, shakli { uz, ru?, en? }. */
export type LocalizedName = Partial<Record<'uz' | 'ru' | 'en', string>>;

export interface InventoryRow {
  id: string;
  sku: string;
  name: LocalizedName;
  basePrice: number;
  imageUrl: string;
  stock: number;
  reserved: number;
  variantCount: number;
  /** Ko'p variantli mahsulotda umumiy sonni bitta qiymatga yozib bo'lmaydi. */
  editable: boolean;
}

export function listInventory() {
  return api<{ items: InventoryRow[] }>('/api/inventory');
}

/** Zaxirani yangilaydi. `quantity` — yakuniy son (ayirma emas). */
export function updateInventory(updates: Array<{ productId: string; quantity: number }>) {
  return api<{ updated: number; skipped: string[] }>('/api/inventory', {
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
