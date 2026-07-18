// Hisob — manzillar (CRUD), saqlangan to'lov usullari, profil (me).

import { authedFetch, authedJson } from './core';

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
  latitude: string | null;
  longitude: string | null;
  pickupPointId: string | null;
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
  latitude?: number | null;
  longitude?: number | null;
  pickupPointId?: string | null;
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

export async function updateAddress(id: string, input: AddressInput): Promise<ApiAddress | null> {
  const data = await authedJson<{ address: ApiAddress }>(`/api/addresses/${id}`, {
    method: 'PATCH',
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
    const res = await authedFetch('/api/auth/me', { method: 'PATCH', body: input });
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
