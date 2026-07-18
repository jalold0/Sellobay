// Promokodlar — hamyon ("Promokodlarim"), qo'shish, checkout validatsiyasi.

import { authedFetch, authedJson } from './core';

export type PromoType = 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';
export type CouponStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'INACTIVE';

export interface UserPromo {
  id: string;
  code: string;
  type: PromoType;
  value: number;
  minOrderTotal: number | null;
  maxDiscount: number | null;
  endsAt: string | null;
  redeemedAt: string | null;
  status: CouponStatus;
}

/** Foydalanuvchining promokodlari ("Promokodlarim"). Login kerak; null = login emas/xato. */
export async function fetchPromos(): Promise<UserPromo[] | null> {
  const data = await authedJson<{ items: UserPromo[] }>('/api/promo');
  return data?.items ?? null;
}

export interface ClaimPromoResult {
  success: boolean;
  code?: string;
  alreadyHad?: boolean;
  error?: { code: string; message: string };
}

/** Kod bo'yicha promokodni hamyonga qo'shish. */
export async function claimPromo(code: string): Promise<ClaimPromoResult> {
  try {
    const res = await authedFetch('/api/promo', { method: 'POST', body: { code } });
    const json = (await res.json()) as {
      success: boolean;
      data?: { code: string; alreadyHad: boolean };
      error?: { code: string; message: string };
    };
    if (!json.success || !json.data) {
      return {
        success: false,
        error: json.error ?? { code: 'UNKNOWN', message: "Qo'shilmadi" },
      };
    }
    return { success: true, code: json.data.code, alreadyHad: json.data.alreadyHad };
  } catch (err) {
    return { success: false, error: { code: 'NETWORK', message: `Tarmoq xatosi: ${String(err)}` } };
  }
}

export interface ValidatePromoResult {
  valid: boolean;
  code?: string;
  type?: PromoType;
  discount?: number;
  reason?: string;
  message?: string;
  minOrderTotal?: number;
}

/** Checkout uchun promokodni tekshirish + chegirma preview. Saqlanmaydi. */
export async function validatePromo(
  code: string,
  subtotal: number,
  shippingFee: number,
): Promise<ValidatePromoResult | null> {
  try {
    const res = await authedFetch('/api/promo/validate', {
      method: 'POST',
      body: { code, subtotal, shippingFee },
    });
    const json = (await res.json()) as { success: boolean; data?: ValidatePromoResult };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}
