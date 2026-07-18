// Auth — login (parol/OTP) → token'lar (mobile uchun response body'da).

import { API_BASE } from './core';

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
