'use client';

import * as React from 'react';

import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

const COLLAPSED_KEY = 'ecom_admin_sidebar_collapsed';

export function Shell({ children }: { children: React.ReactNode }) {
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

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
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
