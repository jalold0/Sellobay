import { Heart, Phone, Search, ShoppingCart, User } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

import { CartBadge } from './cart-badge';
import { LocaleSwitcher } from './locale-switcher';
import { MobileNav } from './mobile-nav';

const CATEGORIES = [
  { slug: 'clothing', label: 'Kiyim-kechak' },
  { slug: 'shoes', label: 'Poyabzal' },
  { slug: 'perfume', label: 'Atirlar' },
  { slug: 'cosmetics', label: 'Kosmetika' },
  { slug: 'beauty', label: "Go'zallik" },
  { slug: 'accessories', label: 'Aksessuarlar' },
];

export function Header() {
  const common = useTranslations('common');
  const nav = useTranslations('nav');
  const locale = useLocale();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Top thin line */}
      <div className="hidden border-b bg-secondary/40 md:block">
        <div className="container flex h-9 items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Phone size={12} />
            <span>+998 71 200 00 00</span>
            <span className="mx-2">·</span>
            <span>24/7 qo&apos;llab-quvvatlash</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/orders" className="hover:text-foreground">
              Buyurtmamni kuzatish
            </Link>
            <Link href="/sell" className="hover:text-foreground">
              Sotuvchi bo&apos;lish
            </Link>
            <LocaleSwitcher current={locale} />
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="container flex h-16 items-center gap-3 md:gap-6">
        <MobileNav />

        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-primary to-rose-500 font-black text-primary-foreground">
            E
          </div>
          <span className="hidden text-lg font-bold tracking-tight md:inline">{common('appName')}</span>
        </Link>

        {/* Search */}
        <form action={`/${locale}/catalog`} className="relative ml-2 hidden flex-1 md:block" role="search">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            name="q"
            placeholder={`${common('search')} — mahsulot, brend, kategoriya`}
            className="h-10 w-full rounded-full border border-input bg-background pl-10 pr-32 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            className="absolute right-1 top-1 h-8 rounded-full bg-primary px-4 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Qidirish
          </button>
        </form>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/login"
            className="hidden items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent md:flex"
          >
            <User size={18} />
            <span>{nav('login')}</span>
          </Link>
          <Link
            href="/profile/wishlist"
            className="grid h-10 w-10 place-items-center rounded-md hover:bg-accent"
            aria-label="Sevimlilar"
          >
            <Heart size={20} />
          </Link>
          <Link
            href="/cart"
            className="relative grid h-10 w-10 place-items-center rounded-md hover:bg-accent"
            aria-label="Savatcha"
          >
            <ShoppingCart size={20} />
            <CartBadge />
          </Link>
        </div>
      </div>

      {/* Mobile search */}
      <div className="container pb-3 md:hidden">
        <form action={`/${locale}/catalog`} role="search" className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            name="q"
            placeholder={common('search')}
            className="h-10 w-full rounded-full border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-primary"
          />
        </form>
      </div>

      {/* Categories nav */}
      <nav className="hidden border-t bg-secondary/30 md:block">
        <div className="container flex h-11 items-center gap-1 overflow-x-auto text-sm">
          <Link href="/catalog" className="rounded-md px-3 py-1.5 font-medium hover:bg-background">
            {nav('catalog')}
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/catalog?category=${c.slug}`}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
            >
              {c.label}
            </Link>
          ))}
          <Link
            href="/sale"
            className="ml-auto whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-rose-600 hover:bg-background"
          >
            🔥 Aksiyalar
          </Link>
        </div>
      </nav>
    </header>
  );
}
