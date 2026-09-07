'use client';

import { pickLocalized, type Locale } from '@ecom/i18n';
import { Heart, Menu, ShoppingBag } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import * as React from 'react';

import { SellobayMark } from '../brand/sellobay-mark';
import { AnimatedSearch } from './animated-search';
import { AuthMenu } from './auth-menu';
import { CartBadge, WishlistBadge } from './cart-badge';
import { LocaleSwitcher } from './locale-switcher';
import { MobileNav } from './mobile-nav';

import type { CategorySummary } from '../../lib/catalog';

interface Props {
  /**
   * Bazadagi kategoriyalar (server layout'dan keladi).
   *
   * Ilgari bu yerda 6 ta slug qotib yozilgan edi va yorliqlar `categories`
   * i18n namespace'idan olinardi. Natijada admin panelida qo'shilgan
   * kategoriya menyuda umuman ko'rinmasdi, mahsuloti yo'q kategoriya esa
   * ko'rinib turardi.
   */
  categories: CategorySummary[];
}

export function Header({ categories }: Props) {
  const common = useTranslations('common');
  const nav = useTranslations('nav');
  const utility = useTranslations('utilityBar');
  const locale = useLocale();

  // Utility bar scroll bilan yashirinadi
  const [scrolled, setScrolled] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={
        'bg-background/95 supports-[backdrop-filter]:bg-background/85 sticky top-0 z-40 backdrop-blur transition-shadow ' +
        (scrolled ? 'shadow-[0_2px_20px_rgba(0,0,0,0.08)]' : '')
      }
    >
      {/* Utility bar — 38px, ink bg, gold nuqta + yetkazish va'dasi */}
      <div
        className={
          'bg-brand-ink overflow-hidden transition-all duration-300 ease-in-out ' +
          (scrolled ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100')
        }
      >
        <div className="container flex h-[38px] items-center justify-between text-xs font-medium text-white/75">
          <div className="flex items-center gap-2">
            <span className="text-brand-gold">●</span>
            <span>{utility('deliveryPromise')}</span>
          </div>
          <div className="flex items-center gap-7">
            <Link href="/sell" className="hidden hover:text-white md:inline">
              {utility('becomeSeller')}
            </Link>
            <Link href="/help" className="hidden hover:text-white md:inline">
              {utility('help')}
            </Link>
            <Link href="/orders" className="hidden hover:text-white md:inline">
              {utility('trackOrder')}
            </Link>
            <LocaleSwitcher current={locale} />
          </div>
        </div>
      </div>

      {/* Main header — 44px logo tile + Playfair wordmark + pill search + ikonka stack */}
      <div className="border-b">
        <div className="container flex items-center gap-3 py-4 md:gap-10">
          <MobileNav categories={categories} />

          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <SellobayMark size={44} priority />
            <span className="text-brand-ink hidden font-serif text-2xl font-bold tracking-[0.01em] md:inline">
              {common('appName')}
            </span>
          </Link>

          {/* Pill search */}
          <div className="hidden flex-1 md:block">
            <AnimatedSearch />
          </div>

          {/* Icon stack: Sevimlilar / Savat / Kirish */}
          <div className="ml-auto flex items-center gap-5 md:gap-7">
            <Link
              href="/profile/wishlist"
              className="relative hidden flex-col items-center gap-[3px] md:flex"
              aria-label={nav('wishlist')}
            >
              <Heart size={22} strokeWidth={1.8} className="text-brand-ink" />
              <WishlistBadge />
              <span className="text-[10.5px] font-semibold text-[#55555c]">{nav('wishlist')}</span>
            </Link>
            <Link
              href="/cart"
              className="relative flex flex-col items-center gap-[3px]"
              aria-label={nav('cart')}
            >
              <ShoppingBag size={22} strokeWidth={1.8} className="text-brand-ink" />
              <CartBadge />
              <span className="hidden text-[10.5px] font-semibold text-[#55555c] md:inline">
                {nav('cart')}
              </span>
            </Link>
            <AuthMenu />
          </div>
        </div>
      </div>

      {/* Mobile search */}
      <div className="container border-b pb-3 pt-3 md:hidden">
        <AnimatedSearch />
      </div>

      {/* Category nav — 48px, SALE crimson, o'ngda Premium */}
      <nav className="hidden border-b bg-white md:block">
        <div className="container flex h-12 items-center gap-8 text-[13.5px] font-semibold text-[#3a3a40]">
          <Link
            href="/catalog"
            className="text-brand-ink hover:text-primary flex shrink-0 items-center gap-2"
          >
            <Menu size={16} strokeWidth={2} />
            {nav('catalog')}
          </Link>
          <div className="flex items-center gap-8 overflow-x-auto">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/catalog?category=${c.slug}`}
                className="hover:text-brand-ink whitespace-nowrap"
              >
                {pickLocalized(c.name, locale as Locale)}
              </Link>
            ))}
            <Link
              href="/sale"
              className="text-primary whitespace-nowrap font-extrabold tracking-[0.04em]"
            >
              SALE
            </Link>
          </div>
          <Link
            href="/profile/loyalty"
            className="text-brand-gold-text ml-auto flex shrink-0 items-center gap-1.5 font-semibold"
          >
            <span className="text-brand-gold">◆</span>
            {utility('premium')}
          </Link>
        </div>
      </nav>
    </header>
  );
}
