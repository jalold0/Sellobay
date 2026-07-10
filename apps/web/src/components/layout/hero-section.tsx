import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

import { type Locale, type MockProduct } from '../../lib/mock-data';

interface Props {
  locale: Locale;
  heroProducts: MockProduct[];
}

const STAT_KEYS = ['sellers', 'products', 'delivery', 'authentic'] as const;

export function HeroSection({ locale: _locale, heroProducts: _heroProducts }: Props) {
  const t = useTranslations('hero');

  return (
    <section className="relative -mx-4 overflow-hidden md:-mx-6 lg:-mx-8 xl:mx-0 xl:rounded-[20px]">
      <div className="relative h-[560px] w-full md:h-[620px]">
        <Image
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=2400&q=85&auto=format&fit=crop"
          alt="Sellobay — yangi mavsum"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        {/* Chapdan o'ngga ink gradient (0.82 → 0.05) */}
        <div className="absolute inset-0 bg-gradient-to-r from-[rgba(10,10,12,0.82)] via-[rgba(10,10,12,0.45)] to-[rgba(10,10,12,0.05)]" />

        <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-16 lg:px-24">
          <div className="max-w-[720px]">
            {/* Eyebrow — gold chiziq + gold-light matn */}
            <div className="flex items-center gap-2.5">
              <div className="bg-brand-gold h-[1.5px] w-8" />
              <span className="text-brand-gold-light text-xs font-bold uppercase tracking-[0.22em]">
                {t('eyebrow')}
              </span>
            </div>

            <h1 className="mt-[22px] font-serif text-4xl font-semibold leading-[1.08] text-white sm:text-5xl md:text-[64px]">
              {t('headlineLine1')}
              <br />
              {t('headlineLine2')}
              <br />
              {t('headlineLine3')}
            </h1>

            <p className="mt-5 max-w-[440px] text-base leading-[1.6] text-white/[0.82]">
              {t('subheadline')}
            </p>

            <div className="mt-[34px] flex flex-wrap gap-3.5">
              <Link
                href="/catalog"
                className="bg-primary hover:bg-primary/90 flex items-center gap-2.5 rounded-full px-8 py-[15px] text-[15px] font-bold text-white transition"
              >
                {t('ctaShop')}
                <ArrowRight size={16} strokeWidth={2.2} />
              </Link>
              <Link
                href="/catalog?sort=newest"
                className="rounded-full border-[1.5px] border-white/45 px-8 py-[15px] text-[15px] font-semibold text-white transition hover:bg-white/10"
              >
                {t('ctaCollection')}
              </Link>
            </div>

            {/* 4-stat strip */}
            <div className="mt-14 flex flex-wrap gap-9 border-t border-white/[0.18] pt-6">
              {STAT_KEYS.map((k) => (
                <div key={k}>
                  <div className="font-serif text-2xl font-bold text-white">
                    {t(`stats.${k}Value`)}
                  </div>
                  <div className="mt-0.5 text-xs text-white/65">{t(`stats.${k}Label`)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
