'use client';

import { toast } from '@ecom/ui';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';

import { useSession } from '../../providers/session-provider';

import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

const COLLAPSED_KEY = 'ecom_admin_sidebar_collapsed';

// Chrome-siz (sidebar/topbar'siz) to'liq ekran ko'rinadigan yo'llar — login va yorliq chop etish.
const CHROMELESS_PREFIXES = ['/login', '/labels/print'];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chromeless = CHROMELESS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`),
  );

  const router = useRouter();
  const { session } = useSession();

  // Vaqtinchalik parol bilan kirgan xodim avval parolini almashtiradi (API'lar ham yopiq).
  const mustChange = session?.mustChangePassword === true;
  React.useEffect(() => {
    if (mustChange && pathname !== '/account') router.replace('/account');
  }, [mustChange, pathname, router]);

  // Middleware ruxsat yo'q bo'limdan `?denied=/yo'l` bilan qaytaradi — sababini aytamiz.
  // Sessiya yuklangach: birinchi render paytida Toaster hali obuna bo'lmagan, xabar yo'qolardi.
  React.useEffect(() => {
    if (!session) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('denied')) return;
    toast({ title: "Bu bo'lim sizning rolingiz uchun yopiq", variant: 'warning' });
    url.searchParams.delete('denied');
    window.history.replaceState(null, '', url.pathname + url.search);
  }, [pathname, session]);

  const [collapsed, setCollapsed] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(COLLAPSED_KEY);
    if (stored === '1') setCollapsed(true);
    setHydrated(true);
  }, []);

  const onToggle = React.useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
      }
      return next;
    });
  }, []);

  // Login kabi yo'llar admin chrome'isiz, to'liq ekran ko'rinadi.
  if (chromeless) {
    return <>{children}</>;
  }

  return (
    <div className="bg-muted/30 flex min-h-screen w-full">
      <div className="sticky top-0 hidden h-screen lg:block">
        <Sidebar collapsed={hydrated && collapsed} onToggle={onToggle} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleSidebar={onToggle} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
