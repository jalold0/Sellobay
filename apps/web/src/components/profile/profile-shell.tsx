'use client';

import { Avatar, AvatarFallback, AvatarImage, Separator, cn } from '@ecom/ui';
import {
  CreditCard,
  Gift,
  Heart,
  LogOut,
  MapPin,
  Package,
  Settings,
  Star,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

const NAV = [
  { href: '/profile', label: 'Shaxsiy ma`lumotlar', icon: User },
  { href: '/profile/orders', label: 'Buyurtmalarim', icon: Package },
  { href: '/profile/wishlist', label: 'Sevimlilar', icon: Heart },
  { href: '/profile/addresses', label: 'Manzillar', icon: MapPin },
  { href: '/profile/payment', label: "To`lov usullari", icon: CreditCard },
  { href: '/profile/loyalty', label: 'Sodiqlik dasturi', icon: Gift },
  { href: '/profile/reviews', label: 'Mening sharhlarim', icon: Star },
  { href: '/profile/settings', label: 'Sozlamalar', icon: Settings },
];

export function ProfileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const cleanPath = pathname.replace(/^\/[a-z]{2}/, '') || '/';

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src="" alt="" />
              <AvatarFallback>UZ</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-semibold">Foydalanuvchi</div>
              <div className="truncate text-xs text-muted-foreground">+998 90 *** ** 00</div>
            </div>
          </div>
        </div>

        <nav className="space-y-0.5 rounded-xl border bg-card p-2">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = cleanPath === n.href || (n.href !== '/profile' && cleanPath.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
                  active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
                )}
              >
                <Icon size={16} />
                <span>{n.label}</span>
              </Link>
            );
          })}
          <Separator className="my-2" />
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <LogOut size={16} />
            <span>Chiqish</span>
          </button>
        </nav>
      </aside>

      <div>{children}</div>
    </div>
  );
}
