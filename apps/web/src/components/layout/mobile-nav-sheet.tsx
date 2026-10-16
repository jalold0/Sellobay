'use client';

import { pickLocalized, type Locale } from '@ecom/i18n';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@ecom/ui';
import { ChevronRight, Heart, Phone, ShoppingBag, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/i18n/navigation';

import { telHref } from '../../lib/support';
import { useSupportContacts } from '../../lib/use-support';

import type { CategorySummary } from '../../lib/catalog';

/**
 * Emoji — FAQAT bezak, ma'lumot manbasi emas.
 *
 * Kategoriyalar ro'yxatining o'zi bazadan keladi; bu jadval shunchaki
 * tanish slug'larga ikonka beradi. Yangi kategoriya bu yerda bo'lmasa
 * standart ikonka ishlatiladi — ro'yxatdan tushib qolmaydi.
 */
const CATEGORY_EMOJI: Record<string, string> = {
  clothing: '👕',
  shoes: '👟',
  perfume: '🌸',
  cosmetics: '💄',
  beauty: '✨',
  accessories: '👜',
};
const DEFAULT_CATEGORY_EMOJI = '🏷️';

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

interface Props {
  /** Bazadagi kategoriyalar — server layout'dan Header orqali keladi. */
  categories: CategorySummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Yopilganda fokus qaytadigan tugma (SheetTrigger `mobile-nav.tsx`da emas). */
  returnFocusRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Mobil menyu paneli — `MobileNav` tugmasi birinchi bosilganda yuklanadi (o'sha fayldagi izoh).
 */
export function MobileNavSheet({ categories, open, onOpenChange, returnFocusRef }: Props) {
  const close = () => onOpenChange(false);
  const locale = useLocale();
  const nav = useTranslations('nav');
  const common = useTranslations('common');
  const cat = useTranslations('categories');
  const footerLinks = useTranslations('footer.links');
  // Telefon ENV dan; sozlanmagan bo'lsa blok ko'rsatilmaydi (audit TRU-01).
  const support = useSupportContacts();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-80 overflow-y-auto p-0"
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          returnFocusRef.current?.focus();
        }}
      >
        {/* Ekran o'qigich uchun dialog nomi (Radix talabi); ko'zga ko'rinadigan sarlavha pastda. */}
        <SheetTitle className="sr-only">{common('menu')}</SheetTitle>
        <SheetDescription className="sr-only">{common('appName')}</SheetDescription>
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
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/catalog?category=${c.slug}`}
                onClick={close}
                className="hover:bg-accent flex items-center gap-3 rounded-md px-3 py-2 text-sm"
              >
                <span className="text-base">
                  {CATEGORY_EMOJI[c.slug] ?? DEFAULT_CATEGORY_EMOJI}
                </span>
                <span>{pickLocalized(c.name, locale as Locale)}</span>
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

        {support.phone ? (
          <div className="border-t p-4">
            <a
              href={telHref(support.phone)}
              className="bg-secondary/50 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium"
            >
              <Phone size={16} className="text-primary" />
              <span>{support.phone}</span>
            </a>
            <div className="text-muted-foreground mt-1 px-3 text-xs">{nav('support247')}</div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
