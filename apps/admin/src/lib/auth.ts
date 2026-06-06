// Admin auth helperlari — JWT decoder, RBAC tekshiruvi.
// Real backend bilan ishlaganda Cookie/HttpOnly variantiga ko'chirish ham mumkin.

import { config } from './config';

export type UserRole =
  | 'CUSTOMER'
  | 'SELLER'
  | 'COURIER'
  | 'WAREHOUSE_STAFF'
  | 'SUPPORT_AGENT'
  | 'MARKETING_MANAGER'
  | 'FINANCE_MANAGER'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export interface AdminSession {
  userId: string;
  roles: UserRole[];
  firstName?: string;
  lastName?: string;
  email?: string;
  avatarUrl?: string;
  exp: number;
}

// Adminga kirishga ruxsat etilgan rollar
export const ADMIN_ROLES: UserRole[] = [
  'ADMIN',
  'SUPER_ADMIN',
  'SUPPORT_AGENT',
  'MARKETING_MANAGER',
  'FINANCE_MANAGER',
];

function base64UrlDecode(input: string): string {
  const pad = input.length % 4 === 0 ? 0 : 4 - (input.length % 4);
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  if (typeof window === 'undefined') {
    return Buffer.from(base64, 'base64').toString('utf-8');
  }
  return window.atob(base64);
}

export function decodeJwt(token: string): AdminSession | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = base64UrlDecode(payload);
    const parsed = JSON.parse(json) as {
      sub: string;
      roles?: UserRole[];
      firstName?: string;
      lastName?: string;
      email?: string;
      avatarUrl?: string;
      exp: number;
    };
    return {
      userId: parsed.sub,
      roles: parsed.roles ?? [],
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      email: parsed.email,
      avatarUrl: parsed.avatarUrl,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function hasRole(session: AdminSession | null, ...roles: UserRole[]): boolean {
  if (!session) return false;
  return roles.some((r) => session.roles.includes(r));
}

export function canAccessAdmin(session: AdminSession | null): boolean {
  return hasRole(session, ...ADMIN_ROLES);
}

export function isSuperAdmin(session: AdminSession | null): boolean {
  return hasRole(session, 'SUPER_ADMIN');
}

export function getStoredSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem(config.tokenStorageKey);
  if (!token) return null;
  const session = decodeJwt(token);
  if (!session) return null;
  if (session.exp * 1000 < Date.now()) return null;
  return session;
}
