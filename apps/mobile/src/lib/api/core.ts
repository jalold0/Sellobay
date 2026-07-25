// API client infra — bazaviy URL, token refresh, umumiy fetch helper'lar.
// api.ts (961 qator) splitidan: barcha domen modullari shu core'dan foydalanadi.

import Constants from 'expo-constants';

import { secureStorage, STORAGE_KEYS } from '../storage';

/**
 * API manzilini aniqlaydi. Backend = web ilova (Next.js /api/* route'lari).
 *  - Dev rejimda (__DEV__): Metro server IP'sini hostUri'dan olib, lokal web
 *    dev serverga ulanadi (http://<wifi-ip>:3000). Shu sabab ishxona/uy
 *    WiFi'sini qo'lda o'zgartirish KERAK EMAS — IP avtomatik to'g'ri keladi.
 *  - Production'da: app.json → extra.apiBaseUrl (Vercel) ishlatiladi.
 */
const WEB_DEV_PORT = 3000;

function resolveApiBase(): string {
  const configured = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;
  const fallback = configured ?? 'https://sellobay-web.vercel.app';

  if (!__DEV__) return fallback;

  // hostUri misol: "192.168.4.28:8081" yoki "192.168.4.28:8081/_expo/..."
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants.expoGoConfig as { debuggerHost?: string } | undefined)?.debuggerHost;
  const host = hostUri?.split(':')[0];

  // localhost/tunnel bo'lsa lokal IP yo'q — fallback'ga qaytamiz.
  if (!host || host === 'localhost' || host === '127.0.0.1') return fallback;

  return `http://${host}:${WEB_DEV_PORT}`;
}

export const API_BASE = resolveApiBase();

export const TIMEOUT_MS = 12_000;

/** Saqlangan access token'dan Authorization header (login bo'lmasa bo'sh). */
async function authHeader(): Promise<Record<string, string>> {
  const token = await secureStorage.get(STORAGE_KEYS.accessToken);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Token refresh (access TTL 15 daqiqa) ────────────────────────
// Access token muddati o'tsa, refresh token bilan yangilaymiz. Bir vaqtda
// ko'p 401 kelsa ham faqat BITTA refresh ketadi (single-flight).
let refreshing: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const refresh = await secureStorage.get(STORAGE_KEYS.refreshToken);
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (res.status === 401) {
      // Refresh ham yaroqsiz/muddati o'tgan (30 kun) — sessiyani tozalaymiz
      const { useSession } = await import('../../store/session');
      void useSession.getState().signOut();
      return false;
    }
    if (!res.ok) return false;
    const json = (await res.json()) as {
      success: boolean;
      data?: { tokens?: { access: string; refresh: string } };
    };
    const tokens = json?.data?.tokens;
    if (!tokens) return false;
    await secureStorage.set(STORAGE_KEYS.accessToken, tokens.access);
    await secureStorage.set(STORAGE_KEYS.refreshToken, tokens.refresh);
    return true;
  } catch {
    return false; // tarmoq xatosi — sessiyani o'chirmaymiz (vaqtinchalik bo'lishi mumkin)
  }
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/** Auth header bilan so'rov; 401 bo'lsa bir marta refresh qilib qayta urinadi. */
export async function authedFetch(
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<Response> {
  const build = async (): Promise<Response> => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      return await fetch(`${API_BASE}${path}`, {
        method: init.method ?? 'GET',
        signal: ctrl.signal,
        headers: {
          Accept: 'application/json',
          ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...(init.headers ?? {}),
          ...(await authHeader()),
        },
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
    } finally {
      clearTimeout(timer);
    }
  };
  let res = await build();
  if (res.status === 401 && (await tryRefresh())) {
    res = await build();
  }
  return res;
}

/** Ommaviy (auth'siz) GET — timeout bilan; !ok bo'lsa throw. */
export async function getJson<T>(path: string): Promise<T> {
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

/** Authdan o'tgan so'rov — xatoni null'ga yutadi (offline UX uchun). */
export async function authedJson<T>(
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<T | null> {
  try {
    const res = await authedFetch(path, init);
    if (!res.ok) return null;
    const json = (await res.json()) as { success: boolean; data?: T };
    return json.success && json.data !== undefined ? json.data : null;
  } catch (err) {
    console.warn('[api] authedJson xato:', path, String(err));
    return null;
  }
}
