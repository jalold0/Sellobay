'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';

import { apiClient } from '../lib/api-client';
import {
  type AdminSession,
  canAccessAdmin,
  decodeJwt,
  getStoredSession,
  hasRole,
  type UserRole,
} from '../lib/auth';

interface SessionContextValue {
  session: AdminSession | null;
  isLoading: boolean;
  signIn: (accessToken: string, refreshToken?: string) => void;
  signOut: () => void;
  has: (...roles: UserRole[]) => boolean;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

// Demo session — useMockData rejimida login bo'lmasa ham admin'ga kirish.
const DEMO_SESSION: AdminSession = {
  userId: 'demo-admin',
  roles: ['SUPER_ADMIN'],
  firstName: 'Demo',
  lastName: 'Admin',
  email: 'admin@example.uz',
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
};

export function SessionProvider({
  children,
  allowDemo = true,
}: {
  children: React.ReactNode;
  allowDemo?: boolean;
}) {
  const router = useRouter();
  const [session, setSession] = React.useState<AdminSession | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const stored = getStoredSession();
    if (stored && canAccessAdmin(stored)) {
      setSession(stored);
    } else if (allowDemo) {
      setSession(DEMO_SESSION);
    }
    setIsLoading(false);
  }, [allowDemo]);

  const signIn = React.useCallback((accessToken: string, refreshToken?: string) => {
    apiClient.setTokens(accessToken, refreshToken);
    const decoded = decodeJwt(accessToken);
    setSession(decoded);
  }, []);

  const signOut = React.useCallback(() => {
    apiClient.clearTokens();
    setSession(null);
    router.push('/login');
  }, [router]);

  const value = React.useMemo<SessionContextValue>(
    () => ({
      session,
      isLoading,
      signIn,
      signOut,
      has: (...roles) => hasRole(session, ...roles),
    }),
    [session, isLoading, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = React.useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}
