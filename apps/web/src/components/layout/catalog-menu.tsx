'use client';

import { ChevronRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { categories, pickLocale, type Locale } from '../../lib/mock-data';

interface Props {
  locale: Locale;
}

/**
 * "Katalog" mega-menyusi.
 *
 * Marketpleyslarda (Uzum, Wildberries, Ozon) katalog qidiruv yonidagi ALOHIDA
 * tugma bo'lib, bosilganda butun kenglikdagi panel ochiladi. Ilgari bu yerda
 * oddiy havola turardi va foydalanuvchi bo'limlar ro'yxatini ko'rish uchun
 * avval katalog sahifasini yuklashi kerak edi.
 */
export function CatalogMenu({ locale }: Props) {
  const nav = useTranslations('nav');
  const gb = useTranslations('groupBuy');
  const t = useTranslations('home');
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const ref = React.useRef<HTMLDivElement>(null);

  // Sahifa almashsa panel yopilsin — aks holda navigatsiyadan keyin ochiq qolardi
  React.useEffect(() => setOpen(false), [pathname]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <div ref={ref} className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className="text-brand-ink hover:text-primary flex shrink-0 items-center gap-2 font-semibold"
      >
        {open ? <X size={16} strokeWidth={2} /> : <Menu size={16} strokeWidth={2} />}
        {nav('catalog')}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-t bg-white shadow-[0_18px_40px_rgba(0,0,0,0.10)]">
          <div className="container py-6">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/catalog?category=${c.slug}`}
                  className="hover:bg-soft group flex items-center justify-between rounded-xl px-4 py-3 transition-colors"
                >
                  <span className="text-brand-ink text-[14px] font-semibold">
                    {pickLocale(c.name, locale)}
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-muted-foreground group-hover:text-primary transition"
                  />
                </Link>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
              <Link
                href="/catalog"
                className="bg-chip text-brand-ink hover:bg-primary rounded-full px-4 py-2 text-[13px] font-semibold transition-colors hover:text-white"
              >
                {t('viewAllLong')}
              </Link>
              <Link
                href="/sale"
                className="bg-primary rounded-full px-4 py-2 text-[13px] font-bold text-white"
              >
                SALE
              </Link>
              <Link
                href="/global"
                className="bg-brand-ink text-brand-gold-light rounded-full px-4 py-2 text-[13px] font-semibold"
              >
                Sellobay Global
              </Link>
              <Link
                href="/group-buy"
                className="bg-chip text-brand-ink hover:bg-primary rounded-full px-4 py-2 text-[13px] font-semibold transition-colors hover:text-white"
              >
                {gb('badge')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
