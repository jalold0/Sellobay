'use client';

import { Sheet, SheetContent, SheetTrigger } from '@ecom/ui';
import { ChevronRight, Heart, Menu, Phone, ShoppingBag, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import * as React from 'react';

type CatSlug = 'clothing' | 'shoes' | 'perfume' | 'cosmetics' | 'beauty' | 'accessories';
const CATEGORIES: { slug: CatSlug; emoji: string }[] = [
  { slug: 'clothing', emoji: '👕' },
  { slug: 'shoes', emoji: '👟' },
  { slug: 'perfume', emoji: '🌸' },
  { slug: 'cosmetics', emoji: '💄' },
  { slug: 'beauty', emoji: '✨' },
  { slug: 'accessories', emoji: '👜' },
];

type NavKey = 'profile' | 'wishlist' | 'myOrders';
const QUICK_LINKS: { href: string; key: NavKey; icon: typeof User }[] = [
  { href: '/profile', key: 'profile', icon: User },
  { href: '/profile/wishlist', key: 'wishlist', icon: Heart },
  { href: '/orders', key: 'myOrders', icon: ShoppingBag },
];

type SupportKey = 'downloadApp' | 'help' | 'delivery' | 'returns' | 'faq' | 'becomeSeller';
const SUPPORT_LINKS: { href: string; key: SupportKey; emoji?: string }[] = [
  { href: '/download', key: 'downloadApp', emoji: '📱' },
  { href: '/help', key: 'help' },
  { href: '/delivery', key: 'delivery' },
  { href: '/returns', key: 'returns' },
  { href: '/faq', key: 'faq' },
  { href: '/sell', key: 'becomeSeller' },
];

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);
  const nav = useTranslations('nav');
  const common = useTranslations('common');
  const cat = useTranslations('categories');
  const footerLinks = useTranslations('footer.links');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="hover:bg-accent grid h-10 w-10 place-items-center rounded-md md:hidden"
          aria-label={common('menu')}
        >
          <Menu size={20} />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto p-0">
        <div className="bg-bordeaux-gradient border-b p-5 text-white">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sellobay-icon-64.png" alt="Sellobay" className="h-9 w-9 rounded-lg shadow" />
            <div className="leading-tight">
              <div className="text-base font-bold">{common('appName')}</div>
              <div className="text-[10px] uppercase tracking-widest opacity-80">
                {common('marketplace')}
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Link
              href="/login"
              onClick={close}
              className="text-foreground flex-1 rounded-full bg-white px-3 py-2 text-center text-sm font-medium"
            >
              {nav('login')}
            </Link>
            <Link
              href="/register"
              onClick={close}
              className="flex-1 rounded-full border border-white/40 px-3 py-2 text-center text-sm font-medium"
            >
              {nav('registerShort')}
            </Link>
          </div>
        </div>

        <div className="space-y-1 p-3">
          {QUICK_LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={close}
                className="hover:bg-accent flex items-center gap-3 rounded-md px-3 py-2.5 text-sm"
              >
                <Icon size={18} className="text-muted-foreground" />
                <span>{nav(l.key)}</span>
                <ChevronRight size={14} className="text-muted-foreground ml-auto" />
              </Link>
            );
          })}
        </div>

        <div className="border-t p-3">
          <div className="text-muted-foreground mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest">
            {cat('title')}
          </div>
          <div className="space-y-0.5">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/catalog?category=${c.slug}`}
                onClick={close}
                className="hover:bg-accent flex items-center gap-3 rounded-md px-3 py-2 text-sm"
              >
                <span className="text-base">{c.emoji}</span>
                <span>{cat(c.slug)}</span>
                <ChevronRight size={14} className="text-muted-foreground ml-auto" />
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t p-3">
          <div className="text-muted-foreground mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest">
            {common('help')}
          </div>
          <div className="space-y-0.5">
            {SUPPORT_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={close}
                className="hover:bg-accent block rounded-md px-3 py-2 text-sm"
              >
                {l.emoji ? `${l.emoji} ` : ''}
                {l.key === 'downloadApp' ? nav('downloadApp') : footerLinks(l.key)}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t p-4">
          <a
            href="tel:+998712000000"
            className="bg-secondary/50 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium"
          >
            <Phone size={16} className="text-primary" />
            <span>+998 71 200 00 00</span>
          </a>
          <div className="text-muted-foreground mt-1 px-3 text-xs">{nav('support247')}</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
