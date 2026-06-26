'use client';

import { Avatar, AvatarFallback, AvatarImage, Separator, cn, toast } from '@ecom/ui';
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
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { logout } from '@/lib/auth/client';
import type { AuthUser } from '@/lib/auth/client';

type NavKey =
  | 'personal'
  | 'orders'
  | 'wishlist'
  | 'addresses'
  | 'payment'
  | 'loyalty'
  | 'reviews'
  | 'settings';

const NAV: { href: string; key: NavKey; icon: typeof User }[] = [
  { href: '/profile', key: 'personal', icon: User },
  { href: '/profile/orders', key: 'orders', icon: Package },
  { href: '/profile/wishlist', key: 'wishlist', icon: Heart },
  { href: '/profile/addresses', key: 'addresses', icon: MapPin },
  { href: '/profile/payment', key: 'payment', icon: CreditCard },
  { href: '/profile/loyalty', key: 'loyalty', icon: Gift },
  { href: '/profile/reviews', key: 'reviews', icon: Star },
  { href: '/profile/settings', key: 'settings', icon: Settings },
];

function getInitials(user: AuthUser): string {
  const f = user.firstName?.[0]?.toUpperCase();
  const l = user.lastName?.[0]?.toUpperCase();
  if (f && l) return f + l;
  if (f) return f;
  if (user.email) return (user.email[0] ?? 'U').toUpperCase();
  if (user.phone) return user.phone.slice(-2);
  return 'UZ';
}

function getDisplayName(user: AuthUser, fallback: string): string {
  const fn = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (fn) return fn;
  return user.email ?? user.phone ?? fallback;
}

function getContactLine(user: AuthUser): string {
  if (user.phone) {
    // E.164 +998901234567 → +998 90 *** ** 67
    const p = user.phone;
    if (p.startsWith('+998') && p.length === 13) {
      return `${p.slice(0, 4)} ${p.slice(4, 6)} *** ** ${p.slice(11, 13)}`;
    }
    return p;
  }
  return user.email ?? '';
}

export function ProfileShell({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('profile');
  const cleanPath = pathname.replace(/^\/[a-z]{2}/, '') || '/';
  const [signingOut, setSigningOut] = React.useState(false);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await logout();
    toast({ title: t('signedOut'), variant: 'success' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-4">
        <div className="bg-card rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatarUrl ?? ''} alt="" />
              <AvatarFallback>{getInitials(user)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-semibold">
                {getDisplayName(user, t('userFallback'))}
              </div>
              <div className="text-muted-foreground truncate text-xs">{getContactLine(user)}</div>
            </div>
          </div>
        </div>

        <nav className="bg-card space-y-0.5 rounded-xl border p-2">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active =
              cleanPath === n.href || (n.href !== '/profile' && cleanPath.startsWith(n.href));
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
                <span>{t(`nav.${n.key}`)}</span>
              </Link>
            );
          })}
          <Separator className="my-2" />
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/20"
          >
            <LogOut size={16} />
            <span>{signingOut ? t('signingOut') : t('signOut')}</span>
          </button>
        </nav>
      </aside>

      <div>{children}</div>
    </div>
  );
}
