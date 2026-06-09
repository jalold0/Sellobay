'use client';

import { cn, ScrollArea } from '@ecom/ui';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { groupNav, sellerNav } from '../../lib/nav';
import { SellobayMark } from '../brand/sellobay-mark';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const groups = groupNav(sellerNav);

  return (
    <aside
      className={cn(
        'bg-card flex h-screen flex-col border-r transition-[width] duration-200',
        collapsed ? 'w-[68px]' : 'w-64',
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <Link href="/" className="flex items-center gap-2 overflow-hidden">
          <SellobayMark size={32} className="shrink-0" priority />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Sellobay</span>
              <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
                Sotuvchi paneli
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={onToggle}
          className="text-muted-foreground hover:bg-accent hidden h-8 w-8 items-center justify-center rounded-md lg:flex"
        >
          <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-6 px-3 py-4">
          {groups.map((g) => (
            <div key={g.group} className="space-y-1">
              {!collapsed && g.group ? (
                <div className="text-muted-foreground px-2 text-[10px] font-semibold uppercase tracking-wider">
                  {g.group}
                </div>
              ) : null}
              {g.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
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

      <div className="text-muted-foreground border-t p-3 text-xs">
        {!collapsed ? (
          <div className="rounded-md bg-gradient-to-br from-amber-50 to-orange-100 p-3 dark:from-amber-950/30 dark:to-orange-950/30">
            <div className="font-semibold text-amber-700 dark:text-amber-300">Reyting: 4.8 ⭐</div>
            <div className="mt-1 text-amber-700/80 dark:text-amber-300/80">
              Saqlash uchun yetkazib berishni o`z vaqtida bajaring.
            </div>
          </div>
        ) : (
          <div className="mx-auto grid h-8 w-8 place-items-center rounded-full bg-amber-100 text-amber-700">
            ⭐
          </div>
        )}
      </div>
    </aside>
  );
}
