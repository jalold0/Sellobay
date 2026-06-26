// Client-side auth API wrapper. Cookie-based session (httpOnly), so fetch credentials: 'include'

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

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl?: string | null;
  locale?: string;
  roles?: string[];
  gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED' | null;
  birthDate?: string | Date | null;
  loyaltyPoints?: number;
}

export interface UpdateProfileInput {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: 'MALE' | 'FEMALE' | 'UNSPECIFIED';
  birthDate?: string | null;
  locale?: 'uz' | 'ru' | 'en';
}

export function loginWithEmail(identifier: string, password: string) {
  return api<{ user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

export function registerWithEmail(input: {
  email?: string;
  phone?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  locale?: 'uz' | 'ru' | 'en';
  role?: 'customer' | 'seller';
}) {
  return api<{ user: AuthUser; pendingApproval?: boolean }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function sendOtp(phone: string) {
  return api<{ sent: boolean; expiresInSec: number }>('/api/auth/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export function verifyOtp(phone: string, code: string, firstName?: string) {
  return api<{ user: AuthUser }>('/api/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code, firstName }),
  });
}

export function logout() {
  return api<{ loggedOut: true }>('/api/auth/logout', { method: 'POST' });
}

export function me() {
  return api<{ user: AuthUser }>('/api/auth/me');
}

export function updateProfile(input: UpdateProfileInput) {
  return api<{ user: AuthUser }>('/api/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
