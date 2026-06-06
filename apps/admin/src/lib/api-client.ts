// Tipli HTTP klient. Auth header'ni avtomatik qo'shadi, 401'da refresh qiladi.
// Real backend'ga moslangan — javob `{success, data}` yoki `{success, error}` ko'rinishida.
// Kelajakda interceptors, retry, abort signal ham shu yerda kengaytiriladi.

import { config } from './config';

export interface ApiError {
  statusCode: number;
  code?: string;
  message: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  constructor(public readonly error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
  authenticated?: boolean;
  raw?: boolean; // raw=true bo'lsa Response qaytariladi (file download uchun)
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(`${config.apiUrl}/api/${config.apiVersion}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(config.tokenStorageKey);
}

function setTokens(access: string, refresh?: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(config.tokenStorageKey, access);
  if (refresh) window.localStorage.setItem(config.refreshTokenStorageKey, refresh);
}

function clearTokens() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(config.tokenStorageKey);
  window.localStorage.removeItem(config.refreshTokenStorageKey);
}

async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const refresh = window.localStorage.getItem(config.refreshTokenStorageKey);
  if (!refresh) return false;
  try {
    const res = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string; refreshToken?: string };
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function doRequest<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const { params, body, authenticated = true, raw, headers, ...rest } = opts;
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (authenticated) {
    const token = getAccessToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method,
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let res = await fetch(buildUrl(path, params), init);

  if (res.status === 401 && authenticated) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const newToken = getAccessToken();
      if (newToken) finalHeaders.Authorization = `Bearer ${newToken}`;
      res = await fetch(buildUrl(path, params), { ...init, headers: finalHeaders });
    } else {
      clearTokens();
    }
  }

  if (raw) return res as unknown as T;

  if (!res.ok) {
    let payload: unknown = null;
    try {
      payload = await res.json();
    } catch {
      // ignore
    }
    const err = (payload as { error?: ApiError })?.error ?? {
      statusCode: res.status,
      message: res.statusText || 'Request failed',
    };
    throw new ApiClientError(err);
  }

  if (res.status === 204) return undefined as T;
  const data = (await res.json()) as unknown;
  // Backend formati `{success, data}` — agar shunday bo'lsa, ichini chiqaramiz
  if (data && typeof data === 'object' && 'data' in data && 'success' in data) {
    return (data as { data: T }).data;
  }
  return data as T;
}

export const apiClient = {
  get: <T>(path: string, opts?: RequestOptions) => doRequest<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    doRequest<T>('POST', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    doRequest<T>('PATCH', path, { ...opts, body }),
  put: <T>(path: string, body?: unknown, opts?: RequestOptions) =>
    doRequest<T>('PUT', path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) => doRequest<T>('DELETE', path, opts),
  setTokens,
  clearTokens,
  getAccessToken,
};
