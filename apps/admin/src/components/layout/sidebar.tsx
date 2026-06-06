'use client';

import { cn, ScrollArea } from '@ecom/ui';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { adminNav, groupNav } from '../../lib/nav';
import { useSession } from '../../providers/session-provider';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  className?: string;
}

export function Sidebar({ collapsed, onToggle, className }: SidebarProps) {
  const pathname = usePathname();
  const { has } = useSession();

  const visible = adminNav.filter((item) => !item.roles || has(...item.roles));
  const groups = groupNav(visible);

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r bg-card transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-64',
        className,
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground font-bold">
            E
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">E-Commerce</span>
              <span className="text-[10px] text-muted-foreground">Admin Panel</span>
            </div>
          )}
        </Link>
        <button
          onClick={onToggle}
          className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent lg:flex"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft
            className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')}
          />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-6 px-3 py-4">
          {groups.map((g) => (
            <div key={g.group} className="space-y-1">
              {!collapsed && g.group ? (
                <div className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {g.group}
                </div>
              ) : null}
              {g.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'group flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      collapsed && 'justify-center',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <div className="border-t p-3">
        <Link
          href="/help"
          className={cn(
            'flex items-center gap-3 rounded-md px-2.5 py-2 text-xs text-muted-foreground hover:bg-accent',
            collapsed && 'justify-center',
          )}
        >
          {collapsed ? '?' : 'Yordam & qo`llanma'}
        </Link>
      </div>
    </aside>
  );
}
