import { SectionTitle } from '@ecom/ui';
import { ChevronRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { categories, pickLocale, productImage, type Locale } from '../../lib/mock-data';

// TZ §3: Har bir kategoriya o'z rang palitrasiga ega
const CATEGORY_THEMES: Record<string, { gradient: string; shadow: string }> = {
  clothing: {
    gradient: 'from-[#1E3A5F]/95 via-[#1E3A5F]/70 to-transparent',
    shadow: 'hover:shadow-[0_20px_60px_-15px_rgba(30,58,95,0.6)]',
  },
  shoes: {
    gradient: 'from-[#2D1B69]/95 via-[#2D1B69]/70 to-transparent',
    shadow: 'hover:shadow-[0_20px_60px_-15px_rgba(45,27,105,0.6)]',
  },
  perfume: {
    gradient: 'from-[#6B2D5E]/95 via-[#6B2D5E]/70 to-transparent',
    shadow: 'hover:shadow-[0_20px_60px_-15px_rgba(107,45,94,0.6)]',
  },
  cosmetics: {
    gradient: 'from-[#C8102E]/95 via-[#C8102E]/70 to-transparent',
    shadow: 'hover:shadow-[0_20px_60px_-15px_rgba(200,16,46,0.6)]',
  },
  beauty: {
    gradient: 'from-[#1A5C4A]/95 via-[#1A5C4A]/70 to-transparent',
    shadow: 'hover:shadow-[0_20px_60px_-15px_rgba(26,92,74,0.6)]',
  },
  accessories: {
    gradient: 'from-[#4A3728]/95 via-[#4A3728]/70 to-transparent',
    shadow: 'hover:shadow-[0_20px_60px_-15px_rgba(74,55,40,0.6)]',
  },
};

interface Props {
  locale: Locale;
}

export function CategoryGrid({ locale }: Props) {
  return (
    <section className="space-y-5">
      <SectionTitle
        title="Kategoriyalar"
        description="Sevimli kategoriyangizni tanlang"
        actionHref="/catalog"
        actionLabel="Barchasi"
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((c, i) => {
          const theme = CATEGORY_THEMES[c.slug] ?? CATEGORY_THEMES.clothing!;
          return (
            <Link
              key={c.id}
              href={`/catalog?category=${c.slug}`}
              className={
                'bg-muted group relative aspect-[2/3] overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 ' +
                'hover:-translate-y-1 ' +
                theme.shadow +
                ' fade-up'
              }
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Background image */}
              <Image
                src={productImage(c.imageSeed, 400)}
                alt={pickLocale(c.name, locale)}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Per-category color gradient overlay */}
              <div className={'absolute inset-0 bg-gradient-to-t ' + theme.gradient} />

              {/* Glass count badge — top right */}
              <div className="absolute right-2.5 top-2.5">
                <span className="glass inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white">
                  {c.productCount.toLocaleString('en-US').replace(/,/g, ' ')}+ mahsulot
                </span>
              </div>

              {/* Bottom content */}
              <div className="absolute inset-x-3 bottom-3 text-white">
                <div className="text-2xl">{c.emoji}</div>
                <div className="mt-1.5 text-sm font-bold leading-tight transition-transform duration-300 group-hover:-translate-y-0.5">
                  {pickLocale(c.name, locale)}
                </div>
                <div className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-white/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  Ko&apos;rish
                  <ChevronRight size={12} />
                </div>
              </div>

              {/* Hover border glow */}
              <div className="absolute inset-0 rounded-2xl border-2 border-white/0 transition-colors duration-300 group-hover:border-white/40" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
