'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { logoutAdmin, meAdmin, type AdminUser } from '@/lib/auth/client';
import { can as canRoles, type Permission } from '@/lib/permissions';

// Admin sessiya — cookie-based (httpOnly), real /api/auth/me orqali olinadi.
// Eski localStorage tokenli api-client o'rnatildi.
export interface AdminSession {
  userId: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  roles: string[];
  avatarUrl?: string | null;
  mustChangePassword: boolean;
}

interface SessionContextValue {
  session: AdminSession | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  has: (...roles: string[]) => boolean;
  /** Bo'lim ruxsati — xarita lib/permissions.ts da (ADR 0019). */
  can: (permission: Permission) => boolean;
  /** /api/auth/me ni qayta o'qish (masalan parol almashgach). */
  reload: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

function userToSession(u: AdminUser): AdminSession {
  return {
    userId: u.id,
    email: u.email,
    phone: u.phone,
    firstName: u.firstName,
    lastName: u.lastName,
    roles: u.roles ?? [],
    mustChangePassword: u.mustChangePassword === true,
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = React.useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    meAdmin().then((res) => {
      if (!mounted) return;
      if (res.success) setSession(userToSession(res.data.user));
      setIsLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const reload = React.useCallback(async () => {
    const res = await meAdmin();
    if (res.success) setSession(userToSession(res.data.user));
  }, []);

  const signOut = React.useCallback(async () => {
    await logoutAdmin();
    setSession(null);
    router.push('/login');
    router.refresh();
  }, [router]);

  const has = React.useCallback(
    (...roles: string[]) => !!session && roles.some((r) => session.roles.includes(r)),
    [session],
  );

  const can = React.useCallback(
    (permission: Permission) => !!session && canRoles(session.roles, permission),
    [session],
  );

  const value = React.useMemo<SessionContextValue>(
    () => ({ session, isLoading, signOut, has, can, reload }),
    [session, isLoading, signOut, has, can, reload],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
