// Buyurtmalar — yaratish/ro'yxat/detal/tahrirlash/bekor/qaytarish + to'lov kartalari.

import type { LocalizedText } from '../mock-data';
import { API_BASE, authedFetch, authedJson } from './core';
import type { PickupPoint } from './pickup';

export interface CreateOrderInput {
  items: Array<{ productId: string; quantity: number; variantId?: string }>;
  recipientName: string;
  phone: string;
  region?: string;
  city: string;
  street: string;
  apartment?: string;
  latitude?: number;
  longitude?: number;
  deliveryMethod: 'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS';
  pickupPointId?: string;
  paymentProvider: 'CLICK' | 'PAYME' | 'UZUM_BANK' | 'UZCARD' | 'HUMO' | 'CASH_ON_DELIVERY';
  notes?: string;
  promoCode?: string;
  redeemCoins?: number;
  // Karta orqali qo'lda to'lov (UZCARD): chek rasmi (data-URL) majburiy + ixtiyoriy izoh
  paymentReceipt?: string;
  paymentNote?: string;
}

// ─── Karta orqali to'lov — platforma kartalari ──────────────────

export interface PaymentCard {
  number: string;
  holder: string;
  bank?: string;
}

export async function fetchPaymentCards(): Promise<PaymentCard[]> {
  try {
    const res = await fetch(`${API_BASE}/api/payment-cards`);
    const json = (await res.json()) as { success: boolean; data?: { cards: PaymentCard[] } };
    return json.success && json.data ? json.data.cards : [];
  } catch {
    return [];
  }
}

export interface CreateOrderResult {
  success: boolean;
  order?: { id: string; number: string; status: string; grandTotal: string };
  error?: { code: string; message: string };
}

export async function createOrder(
  input: CreateOrderInput,
  idempotencyKey?: string,
): Promise<CreateOrderResult> {
  try {
    const res = await authedFetch('/api/orders', {
      method: 'POST',
      body: input,
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined,
    });
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

// ─── Buyurtmalar ro'yxati ────────────────────────────────────────

export type OrderScope = 'LOCAL' | 'GLOBAL';

export interface OrderAddress {
  recipientName: string;
  phone: string;
  region: string;
  city: string;
  district: string | null;
  street: string;
  building: string | null;
  apartment: string | null;
}

export interface ApiOrder {
  id: string;
  number: string;
  status: string;
  grandTotal: string;
  placedAt: string;
  paidAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  deliveryMethod: string;
  scope: OrderScope;
  shippingAddress: OrderAddress | null;
  pickupPoint: PickupPoint | null;
  itemCount: number;
  items: Array<{
    id: string;
    quantity: number;
    nameSnapshot: LocalizedText | string;
    totalPrice: string;
    slug: string | null;
    imageUrl: string | null;
  }>;
}

/**
 * Joriy user buyurtmalari.
 * Muhim: bu funksiya tarmoq/server xatosida `throw` qiladi (authedJson'dan farqli,
 * u null yutadi) — shunda React Query `isError` ni ko'radi va UI "offline"ni
 * "buyurtma yo'q"dan ajrata oladi. 401 (login emas) → bo'sh ro'yxat.
 */
export async function fetchOrders(): Promise<ApiOrder[]> {
  const res = await authedFetch('/api/orders');
  if (res.status === 401) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { success: boolean; data?: { items: ApiOrder[] } };
  return json.data?.items ?? [];
}

// ─── Bitta buyurtma (detal) + tahrirlash/bekor qilish ────────────

export interface OrderDetail extends Omit<ApiOrder, 'items'> {
  subtotal: string;
  shippingTotal: string;
  discountTotal: string;
  promoCode: string | null;
  notes: string | null;
  editable: boolean;
  returnable: boolean;
  returnWindowDays: number;
  items: Array<{
    id: string;
    quantity: number;
    nameSnapshot: LocalizedText | string;
    unitPrice: string;
    totalPrice: string;
    slug: string | null;
    imageUrl: string | null;
  }>;
}

/** Bitta buyurtma detali. */
export async function fetchOrder(id: string): Promise<OrderDetail | null> {
  const data = await authedJson<{ order: OrderDetail }>(`/api/orders/${id}`);
  return data?.order ?? null;
}

export interface UpdateOrderInput {
  recipientName?: string;
  phone?: string;
  region?: string;
  city?: string;
  street?: string;
  apartment?: string | null;
  deliveryMethod?: 'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS';
  notes?: string | null;
}

export interface UpdateOrderResult {
  success: boolean;
  order?: OrderDetail;
  error?: { code: string; message: string };
}

/** PENDING buyurtmani tahrirlash. */
export async function updateOrder(id: string, patch: UpdateOrderInput): Promise<UpdateOrderResult> {
  try {
    const res = await authedFetch(`/api/orders/${id}`, { method: 'PATCH', body: patch });
    const json = (await res.json()) as {
      success: boolean;
      data?: { order: OrderDetail };
      error?: { code: string; message: string };
    };
    if (!json.success || !json.data) {
      return { success: false, error: json.error ?? { code: 'UNKNOWN', message: 'Saqlanmadi' } };
    }
    return { success: true, order: json.data.order };
  } catch (err) {
    return { success: false, error: { code: 'NETWORK', message: `Tarmoq xatosi: ${String(err)}` } };
  }
}

export interface CancelOrderResult {
  success: boolean;
  coinsRefunded?: number;
  coinsRevoked?: number;
  error?: { code: string; message: string };
}

/** PENDING buyurtmani bekor qilish (coin/promo qaytariladi). */
export async function cancelOrder(id: string, reason?: string): Promise<CancelOrderResult> {
  try {
    const res = await authedFetch(`/api/orders/${id}/cancel`, {
      method: 'POST',
      body: { reason },
    });
    const json = (await res.json()) as {
      success: boolean;
      data?: { coinsRefunded: number; coinsRevoked: number };
      error?: { code: string; message: string };
    };
    if (!json.success) {
      return {
        success: false,
        error: json.error ?? { code: 'UNKNOWN', message: 'Bekor qilinmadi' },
      };
    }
    return {
      success: true,
      coinsRefunded: json.data?.coinsRefunded,
      coinsRevoked: json.data?.coinsRevoked,
    };
  } catch (err) {
    return { success: false, error: { code: 'NETWORK', message: `Tarmoq xatosi: ${String(err)}` } };
  }
}

// ─── Buyurtmani qaytarish (punktda tekshirib / uy qaytarishi) ────

export interface ReturnOrderResult {
  success: boolean;
  coinsRefunded?: number;
  coinsRevoked?: number;
  error?: { code: string; message: string };
}

/** Yetkazilgan buyurtmani qaytarish (14 kun ichida). Pul refundi ops/qo'lda. */
export async function returnOrder(id: string, reason?: string): Promise<ReturnOrderResult> {
  try {
    const res = await authedFetch(`/api/orders/${id}/return`, { method: 'POST', body: { reason } });
    const json = (await res.json()) as {
      success: boolean;
      data?: { coinsRefunded: number; coinsRevoked: number };
      error?: { code: string; message: string };
    };
    if (!json.success) {
      return { success: false, error: json.error ?? { code: 'UNKNOWN', message: 'Qaytarilmadi' } };
    }
    return {
      success: true,
      coinsRefunded: json.data?.coinsRefunded,
      coinsRevoked: json.data?.coinsRevoked,
    };
  } catch (err) {
    return { success: false, error: { code: 'NETWORK', message: `Tarmoq xatosi: ${String(err)}` } };
  }
}

// Faol (yo'ldagi) statuslar — terminal bo'lmaganlar
const TERMINAL_STATUSES = new Set(['DELIVERED', 'CANCELLED', 'RETURNED', 'REFUNDED']);

/** Buyurtma faolmi (hali yetkazilmagan/yakunlanmagan)? */
export function isActiveOrder(status: string): boolean {
  return !TERMINAL_STATUSES.has(status);
}
