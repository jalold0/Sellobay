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
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      {/* Top thin line */}
      <div className="bg-secondary/40 hidden border-b md:block">
        <div className="text-muted-foreground container flex h-9 items-center justify-between text-xs">
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
          <div className="from-primary text-primary-foreground grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br to-rose-500 font-black">
            E
          </div>
          <span className="hidden text-lg font-bold tracking-tight md:inline">
            {common('appName')}
          </span>
        </Link>

        {/* Search */}
        <form
          action={`/${locale}/catalog`}
          className="relative ml-2 hidden flex-1 md:block"
          role="search"
        >
          <Search
            size={18}
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            type="search"
            name="q"
            placeholder={`${common('search')} — mahsulot, brend, kategoriya`}
            className="border-input bg-background focus:border-primary focus:ring-primary/20 h-10 w-full rounded-full border pl-10 pr-32 text-sm outline-none transition focus:ring-2"
          />
          <button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90 absolute right-1 top-1 h-8 rounded-full px-4 text-xs font-medium"
          >
            Qidirish
          </button>
        </form>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-1">
          <Link
            href="/login"
            className="hover:bg-accent hidden items-center gap-2 rounded-md px-3 py-2 text-sm md:flex"
          >
            <User size={18} />
            <span>{nav('login')}</span>
          </Link>
          <Link
            href="/profile/wishlist"
            className="hover:bg-accent grid h-10 w-10 place-items-center rounded-md"
            aria-label="Sevimlilar"
          >
            <Heart size={20} />
          </Link>
          <Link
            href="/cart"
            className="hover:bg-accent relative grid h-10 w-10 place-items-center rounded-md"
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
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
          />
          <input
            type="search"
            name="q"
            placeholder={common('search')}
            className="border-input bg-background focus:border-primary h-10 w-full rounded-full border pl-10 pr-3 text-sm outline-none"
          />
        </form>
      </div>

      {/* Categories nav */}
      <nav className="bg-secondary/30 hidden border-t md:block">
        <div className="container flex h-11 items-center gap-1 overflow-x-auto text-sm">
          <Link href="/catalog" className="hover:bg-background rounded-md px-3 py-1.5 font-medium">
            {nav('catalog')}
          </Link>
          {CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/catalog?category=${c.slug}`}
              className="text-muted-foreground hover:bg-background hover:text-foreground whitespace-nowrap rounded-md px-3 py-1.5"
            >
              {c.label}
            </Link>
          ))}
          <Link
            href="/download"
            className="text-foreground hover:bg-background ml-auto whitespace-nowrap rounded-md px-3 py-1.5 font-medium"
          >
            📱 Ilovani yuklab olish
          </Link>
          <Link
            href="/sale"
            className="hover:bg-background whitespace-nowrap rounded-md px-3 py-1.5 font-medium text-rose-600"
          >
            🔥 Aksiyalar
          </Link>
        </div>
      </nav>
    </header>
  );
}
