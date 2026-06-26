import { Button } from '@ecom/ui';
import { ArrowRight, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

import { type Locale, type MockProduct } from '../../lib/mock-data';

interface Props {
  locale: Locale;
  heroProducts: MockProduct[];
}

export function HeroSection({ locale: _locale, heroProducts: _heroProducts }: Props) {
  const t = useTranslations('hero');

  return (
    <section className="relative -mx-4 overflow-hidden md:-mx-6 lg:-mx-8 xl:mx-0 xl:rounded-[2rem]">
      <div className="relative h-[560px] w-full md:h-[640px] lg:h-[720px]">
        <Image
          src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=2400&q=85&auto=format&fit=crop"
          alt="Sellobay marketplace"
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute inset-0 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-6 md:px-10 lg:px-14">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 backdrop-blur">
                <Sparkles size={12} className="text-brand-gold" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/95">
                  {t('eyebrow')}
                </span>
              </div>

              <h1 className="font-display mt-5 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
                {t('headlineLine1')}
                <br />
                <span className="via-brand-gold bg-gradient-to-r from-white to-white bg-clip-text text-transparent">
                  {t('headlineLine2')}
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
                {t('subheadline')}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="bg-bordeaux-gradient shadow-bordeaux px-7 text-base font-semibold text-white hover:opacity-95"
                >
                  <Link href="/catalog">
                    {t('ctaShop')}
                    <ArrowRight size={18} className="ml-2" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/30 bg-white/10 px-7 text-base font-semibold text-white backdrop-blur hover:bg-white/20"
                >
                  <Link href="/sell">{t('ctaSell')}</Link>
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/15 pt-6 text-xs font-medium text-white/85">
                <div className="flex items-center gap-1.5">
                  <Truck size={14} className="text-brand-gold" />
                  <span>{t('trustFast')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-brand-gold" />
                  <span>{t('trustAuthentic')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-brand-gold" />
                  <span>{t('trustReturn')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {_heroProducts[0] ? (
          <Link
            href={`/product/${_heroProducts[0].slug}`}
            className="absolute right-10 top-1/2 hidden -translate-y-1/2 lg:block"
          >
            <div className="group relative w-[280px] overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-md transition-all hover:-translate-y-1 hover:shadow-2xl">
              <div className="relative aspect-[4/5]">
                <Image
                  src={`https://picsum.photos/seed/${_heroProducts[0].imageSeed}/600/750`}
                  alt={_heroProducts[0].brand}
                  fill
                  sizes="280px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <div className="text-brand-gold text-[10px] font-bold uppercase tracking-[0.2em]">
                  {t('editorsPick')}
                </div>
                <div className="mt-1 line-clamp-2 text-sm font-semibold leading-tight">
                  {_heroProducts[0].brand}
                </div>
              </div>
            </div>
          </Link>
        ) : null}
      </div>
    </section>
  );
}
