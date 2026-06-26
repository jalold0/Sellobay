'use client';

import { Heart, Phone, ShoppingCart } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import * as React from 'react';

import { SellobayMark } from '../brand/sellobay-mark';
import { AnimatedSearch } from './animated-search';
import { AuthMenu } from './auth-menu';
import { CartBadge } from './cart-badge';
import { LocaleSwitcher } from './locale-switcher';
import { MobileNav } from './mobile-nav';

const CATEGORY_SLUGS = [
  'clothing',
  'shoes',
  'perfume',
  'cosmetics',
  'beauty',
  'accessories',
] as const;

export function Header() {
  const common = useTranslations('common');
  const nav = useTranslations('nav');
  const cat = useTranslations('categories');
  const locale = useLocale();

  // TZ §1: Top bar scroll bilan yashirinadi
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
      {/* TZ §1: Top bar — dark, 32px, scroll bilan yashirinadi */}
      <div
        className={
          'bg-secondary overflow-hidden transition-all duration-300 ease-in-out ' +
          (scrolled ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100')
        }
      >
        <div className="container flex h-8 items-center justify-between text-[11px] text-white/85">
          <div className="flex items-center gap-2">
            <Phone size={11} />
            <a href="tel:+998712000000" className="hover:text-white">
              +998 71 200 00 00
            </a>
            <span className="mx-2 text-white/30">·</span>
            <span className="hidden md:inline">{nav('support247')}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/orders" className="hidden hover:text-white md:inline">
              {nav('trackOrder')}
            </Link>
            <Link href="/sell" className="hidden hover:text-white md:inline">
              {nav('becomeSeller')}
            </Link>
            <LocaleSwitcher current={locale} />
          </div>
        </div>
      </div>

      {/* TZ §1: Main bar — 72px, white, sticky */}
      <div className="border-b">
        <div className="container flex h-[68px] items-center gap-3 md:gap-6">
          <MobileNav />

          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <SellobayMark size={40} className="shadow-sm" priority />
            <div className="hidden flex-col leading-tight md:flex">
              <span className="text-base font-bold tracking-tight">{common('appName')}</span>
              <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
                {common('marketplace')}
              </span>
            </div>
          </Link>

          {/* Search (50% width) */}
          <div className="hidden flex-1 md:block">
            <AnimatedSearch />
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1">
            <AuthMenu />
            <Link
              href="/profile/wishlist"
              className="hover:bg-muted grid h-10 w-10 place-items-center rounded-lg"
              aria-label={nav('wishlist')}
            >
              <Heart size={20} />
            </Link>
            <Link
              href="/cart"
              className="hover:bg-muted relative grid h-10 w-10 place-items-center rounded-lg"
              aria-label={nav('cart')}
            >
              <ShoppingCart size={20} />
              <CartBadge />
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile search */}
      <div className="container border-b pb-3 pt-3 md:hidden">
        <AnimatedSearch />
      </div>

      {/* TZ §1: Nav bar — 48px, light bg, with hover underline */}
      <nav className="bg-muted/30 hidden border-b md:block">
        <div className="container flex h-12 items-center gap-1 overflow-x-auto text-sm">
          <Link
            href="/catalog"
            className="nav-underline text-foreground hover:text-primary rounded-md px-3 py-1.5 font-semibold"
          >
            ≡ {nav('catalog')}
          </Link>
          {CATEGORY_SLUGS.map((slug) => (
            <Link
              key={slug}
              href={`/catalog?category=${slug}`}
              className="nav-underline text-muted-foreground hover:text-foreground whitespace-nowrap rounded-md px-3 py-1.5"
            >
              {cat(slug)}
            </Link>
          ))}
          <Link
            href="/download"
            className="nav-underline ml-auto whitespace-nowrap rounded-md px-3 py-1.5 font-medium"
          >
            📱 {nav('downloadApp')}
          </Link>
          {/* TZ §1: Aksiyalar — gradient pill + animated emoji */}
          <Link
            href="/sale"
            className="from-primary to-brand-orange group inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-gradient-to-r px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:shadow-md"
          >
            <span className="animate-bounce-slow inline-block">🔥</span>
            {nav('sale')}
          </Link>
        </div>
      </nav>
    </header>
  );
}
