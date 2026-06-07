'use client';

import { Sheet, SheetContent, SheetTrigger } from '@ecom/ui';
import { ChevronRight, Heart, Menu, Phone, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

const CATEGORIES = [
  { slug: 'clothing', label: 'Kiyim-kechak', emoji: '👕' },
  { slug: 'shoes', label: 'Poyabzal', emoji: '👟' },
  { slug: 'perfume', label: 'Atirlar', emoji: '🌸' },
  { slug: 'cosmetics', label: 'Kosmetika', emoji: '💄' },
  { slug: 'beauty', label: "Go'zallik", emoji: '✨' },
  { slug: 'accessories', label: 'Aksessuarlar', emoji: '👜' },
];

const QUICK_LINKS = [
  { href: '/profile', label: 'Profil', icon: User },
  { href: '/profile/wishlist', label: 'Sevimlilar', icon: Heart },
  { href: '/orders', label: 'Buyurtmalarim', icon: ShoppingBag },
];

const SUPPORT_LINKS = [
  { href: '/help', label: "Qo'llab-quvvatlash" },
  { href: '/delivery', label: 'Yetkazib berish' },
  { href: '/returns', label: 'Qaytarish' },
  { href: '/faq', label: 'FAQ' },
  { href: '/sell', label: "Sotuvchi bo'lish" },
];

export function MobileNav() {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-md hover:bg-accent md:hidden"
          aria-label="Menyu"
        >
          <Menu size={20} />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 overflow-y-auto p-0">
        <div className="border-b bg-gradient-to-br from-primary to-rose-500 p-5 text-primary-foreground">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/15 font-black backdrop-blur">
              E
            </div>
            <div className="leading-tight">
              <div className="text-base font-bold">E-Commerce</div>
              <div className="text-[10px] opacity-80">Ekosistema</div>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Link
              href="/login"
              onClick={close}
              className="flex-1 rounded-full bg-white px-3 py-2 text-center text-sm font-medium text-foreground"
            >
              Kirish
            </Link>
            <Link
              href="/register"
              onClick={close}
              className="flex-1 rounded-full border border-white/40 px-3 py-2 text-center text-sm font-medium"
            >
              Ro&apos;yxatdan
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
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent"
              >
                <Icon size={18} className="text-muted-foreground" />
                <span>{l.label}</span>
                <ChevronRight size={14} className="ml-auto text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        <div className="border-t p-3">
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Kategoriyalar
          </div>
          <div className="space-y-0.5">
            {CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/catalog?category=${c.slug}`}
                onClick={close}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="text-base">{c.emoji}</span>
                <span>{c.label}</span>
                <ChevronRight size={14} className="ml-auto text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t p-3">
          <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Yordam
          </div>
          <div className="space-y-0.5">
            {SUPPORT_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={close}
                className="block rounded-md px-3 py-2 text-sm hover:bg-accent"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t p-4">
          <a
            href="tel:+998712000000"
            className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2.5 text-sm font-medium"
          >
            <Phone size={16} className="text-primary" />
            <span>+998 71 200 00 00</span>
          </a>
          <div className="mt-1 px-3 text-xs text-muted-foreground">24/7 qo&apos;llab-quvvatlash</div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
