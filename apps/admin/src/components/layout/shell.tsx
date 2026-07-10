'use client';

import { usePathname } from 'next/navigation';
import * as React from 'react';

import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

const COLLAPSED_KEY = 'ecom_admin_sidebar_collapsed';

// Chrome-siz (sidebar/topbar'siz) to'liq ekran ko'rinadigan yo'llar — login sahifasi.
const CHROMELESS_PREFIXES = ['/login'];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const chromeless = CHROMELESS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`),
  );

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
