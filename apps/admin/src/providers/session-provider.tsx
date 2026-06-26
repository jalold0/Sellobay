'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { logoutAdmin, meAdmin, type AdminUser } from '@/lib/auth/client';

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
}

interface SessionContextValue {
  session: AdminSession | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
  has: (...roles: string[]) => boolean;
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

  const value = React.useMemo<SessionContextValue>(
    () => ({ session, isLoading, signOut, has }),
    [session, isLoading, signOut, has],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
