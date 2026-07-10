'use client';

import { Avatar, AvatarFallback, AvatarImage, cn, toast } from '@ecom/ui';
import { CreditCard, Gift, Heart, MapPin, Package, Settings, Star, User } from 'lucide-react';
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
  { href: '/profile/addresses', key: 'addresses', icon: MapPin },
  { href: '/profile/payment', key: 'payment', icon: CreditCard },
  { href: '/profile/wishlist', key: 'wishlist', icon: Heart },
  { href: '/profile/loyalty', key: 'loyalty', icon: Gift },
  { href: '/profile/reviews', key: 'reviews', icon: Star },
  { href: '/profile/settings', key: 'settings', icon: Settings },
];

// Premium ball darajalari (ball asosida — kartaning progress ko'rsatkichi uchun)
const PREMIUM_TIERS: { key: 'bronze' | 'silver' | 'gold' | 'platinum'; min: number }[] = [
  { key: 'bronze', min: 0 },
  { key: 'silver', min: 20_000 },
  { key: 'gold', min: 50_000 },
  { key: 'platinum', min: 200_000 },
];

function groupNum(n: number): string {
  return String(Math.max(0, Math.trunc(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

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

export function ProfileShell({ user, children }: { user: AuthUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('profile');
  const tl = useTranslations('loyalty');
  const cleanPath = pathname.replace(/^\/[a-z]{2}/, '') || '/';
  const [signingOut, setSigningOut] = React.useState(false);

  const points = user.loyaltyPoints ?? 0;
  const tierIdx = PREMIUM_TIERS.reduce((acc, t2, i) => (points >= t2.min ? i : acc), 0);
  const tier = PREMIUM_TIERS[tierIdx]!;
  const next = PREMIUM_TIERS[tierIdx + 1];
  const progressPct = next ? Math.min(100, (points / next.min) * 100) : 100;
  const toNext = next ? next.min - points : 0;

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await logout();
    toast({ title: t('signedOut'), variant: 'success' });
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr] lg:gap-8">
      <aside className="flex flex-col gap-4">
        {/* Premium ball karta — 1f */}
        <div className="from-brand-ink-soft to-brand-ink relative overflow-hidden rounded-[18px] bg-gradient-to-br p-6 text-white">
          <div className="border-brand-gold/25 pointer-events-none absolute -right-8 -top-8 h-[120px] w-[120px] rounded-full border" />
          <div className="border-brand-gold/20 pointer-events-none absolute -right-2.5 -top-2.5 h-20 w-20 rounded-full border" />
          <div className="text-brand-gold flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em]">
            <span>◆</span>
            {t('premiumCard.label')}
          </div>
          <div className="mt-3 font-serif text-[30px] font-bold leading-none">
            {groupNum(points)}
          </div>
          <div className="mt-1 text-xs text-white/65">
            {t('premiumCard.pointsTier', { tier: tl(`tiers.${tier.key}`) })}
          </div>
          <div className="mt-4 h-[5px] overflow-hidden rounded-full bg-white/15">
            <div
              className="from-brand-gold to-brand-gold-bright h-full rounded-full bg-gradient-to-r"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {next && (
            <div className="mt-2 text-[11px] text-white/55">
              {t('premiumCard.toNext', {
                tier: tl(`tiers.${next.key}`),
                points: groupNum(toNext),
              })}
            </div>
          )}
        </div>

        {/* Avatar chip */}
        <div className="border-border flex items-center gap-3 rounded-[18px] border bg-white p-4">
          <Avatar className="h-11 w-11">
            <AvatarImage src={user.avatarUrl ?? ''} alt="" />
            <AvatarFallback className="bg-primary text-white">{getInitials(user)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-brand-ink truncate text-sm font-semibold">
              {getDisplayName(user, t('userFallback'))}
            </div>
          </div>
        </div>

        {/* Nav karta */}
        <nav className="border-border flex flex-col rounded-[18px] border bg-white p-2.5">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active =
              cleanPath === n.href || (n.href !== '/profile' && cleanPath.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center gap-3 rounded-[12px] px-4 py-3 text-[13.5px] transition',
                  active
                    ? 'bg-primary font-bold text-white'
                    : 'hover:bg-muted font-semibold text-[#3a3a40]',
                )}
              >
                <Icon size={16} />
                <span>{t(`nav.${n.key}`)}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-primary hover:bg-primary/5 mt-2 flex items-center gap-3 rounded-[12px] border-t border-[#F1F1F3] px-4 py-3 text-[13.5px] font-semibold transition disabled:opacity-50"
          >
            {signingOut ? t('signingOut') : t('signOut')}
          </button>
        </nav>
      </aside>

      <div>{children}</div>
    </div>
  );
}
