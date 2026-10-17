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
    // Server JSON o'rniga xato sahifasini qaytarsa (500) — bu tarmoq emas, server xatosi.
    // Ilgari ikkalasi ham «Tarmoq xatosi. Internetingizni tekshiring» deb ko'rinardi.
    const json = (await res.json().catch(() => null)) as ApiResult<T> | null;
    if (!json) {
      return {
        success: false,
        error: {
          code: 'SERVER',
          message: `Server xatosi (${res.status}). Birozdan keyin qayta urinib ko'ring.`,
        },
      };
    }
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

export function loginSeller(identifier: string, password: string, remember = false) {
  return api<{ user: SellerUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password, remember }),
  });
}

export function logoutSeller() {
  return api<{ loggedOut: true }>('/api/auth/logout', { method: 'POST' });
}

export interface SellerShop {
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  brandName: string;
  suspendReason: string | null;
  /** Yangi tovarlar shu model bilan yaratiladi; modelni admin belgilaydi (ADR 0015). */
  fulfillmentModel: 'FBS' | 'FBO';
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
  /** FBO — zaxirani ombor yuritadi, sotuvchi o'zgartirmaydi (ADR 0015). */
  fulfillmentModel: 'FBS' | 'FBO';
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
}

export function getSellerStats() {
  return api<SellerStats>('/api/stats');
}

// ── Moliya — hisob daftari (ADR 0015) ─────────────────────────────
export type LedgerEntryType =
  | 'SALE'
  | 'COMMISSION'
  | 'FULFILLMENT_FEE'
  | 'RETURN_SALE'
  | 'RETURN_COMMISSION'
  | 'RETURN_FULFILLMENT_FEE'
  | 'PAYOUT'
  | 'ADJUSTMENT';

export interface SellerFinance {
  balance: {
    pending: string;
    available: string;
    inPayout: string;
    paid: string;
    nextPayoutAt: string;
    nextPayoutAmount: string;
  };
  tariff: { model: 'FBS' | 'FBO'; commissionPct: number; feePerUnit: string; payoutDays: number[] };
  bank: { name: string | null; accountTail: string | null };
  entries: Array<{
    id: string;
    type: LedgerEntryType;
    amount: string;
    availableAt: string;
    createdAt: string;
    note: string | null;
    inPayout: boolean;
    orderNumber: string | null;
  }>;
  payouts: Array<{
    id: string;
    amount: string;
    status: string;
    periodStart: string;
    periodEnd: string;
    paidAt: string | null;
    reference: string | null;
  }>;
}

export function getSellerFinance() {
  return api<SellerFinance>('/api/finance');
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
