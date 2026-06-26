import { Button } from '@ecom/ui';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

import { pickLocale, productImage, type Locale, type MockProduct } from '../../lib/mock-data';

interface Props {
  locale: Locale;
  products: MockProduct[];
  title?: string;
  subtitle?: string;
  ctaHref?: string;
}

export function FeaturedCollection({
  locale,
  products,
  title,
  subtitle,
  ctaHref = '/catalog?featured=true',
}: Props) {
  const t = useTranslations('featured');
  const common = useTranslations('common');
  const resolvedTitle = title ?? t('title');
  const resolvedSubtitle = subtitle ?? t('subtitle');
  const items = products.slice(0, 3);
  if (items.length < 3) return null;

  return (
    <section className="bg-editorial-warm relative overflow-hidden rounded-[2rem] px-4 py-14 md:px-12 md:py-20">
      {/* Decorative gold accent — yumshoq oltin chiziq */}
      <div className="bg-gold-gradient absolute inset-x-0 top-0 h-px" />
      <div className="bg-gold-gradient absolute inset-x-0 bottom-0 h-px" />

      {/* Section header — markaziy editorial */}
      <div className="relative mx-auto mb-12 max-w-3xl text-center md:mb-16">
        <span className="text-gold-gradient mb-3 inline-block text-[11px] font-bold uppercase tracking-[0.25em]">
          {t('eyebrow')}
        </span>
        <h2 className="text-foreground font-display text-3xl font-black leading-tight tracking-tight md:text-5xl">
          {resolvedTitle}
        </h2>
        <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm md:text-base">
          {resolvedSubtitle}
        </p>
      </div>

      {/* 3 staggered tilted product cards */}
      <div className="relative mx-auto grid max-w-6xl grid-cols-12 items-center gap-4 md:gap-8">
        {/* Card 1 — chap, qiya, biroz balandroqda (offset bilan) */}
        <Link
          href={`/product/${items[0]!.slug}`}
          className="col-span-6 -mt-4 md:col-span-4 md:mt-0"
        >
          <article className="editorial-card tilt-left">
            <div className="relative aspect-[3/4] bg-white">
              <Image
                src={productImage(items[0]!.imageSeed, 600)}
                alt={pickLocale(items[0]!.name, locale)}
                fill
                sizes="(max-width: 768px) 45vw, 320px"
                className="object-cover"
              />
              {/* Gold corner accent */}
              <div className="bg-brand-gold absolute right-3 top-3 h-1.5 w-8 rounded-full" />
            </div>
            <div className="bg-white p-4">
              <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                {items[0]!.brand}
              </div>
              <div className="text-foreground mt-1 line-clamp-1 text-sm font-bold">
                {pickLocale(items[0]!.name, locale)}
              </div>
              <div className="text-brand-bordeaux mt-1.5 text-base font-black">
                {items[0]!.price.toLocaleString('en-US').replace(/,/g, ' ')} {common('currency')}
              </div>
            </div>
          </article>
        </Link>

        {/* Card 2 — markaz, katta, dominant */}
        <Link href={`/product/${items[1]!.slug}`} className="col-span-12 md:col-span-4">
          <article className="editorial-card group">
            <div className="relative aspect-[4/5] bg-white">
              <Image
                src={productImage(items[1]!.imageSeed, 900)}
                alt={pickLocale(items[1]!.name, locale)}
                fill
                sizes="(max-width: 768px) 90vw, 400px"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Editorial overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

              {/* Premium label — top */}
              <div className="absolute left-4 right-4 top-4 flex items-start justify-between">
                <span className="bg-brand-gold text-brand-bordeaux-deep rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-md">
                  {t('editorChoice')}
                </span>
                <div className="bg-brand-gold h-1.5 w-12 rounded-full" />
              </div>

              {/* Content — bottom */}
              <div className="absolute bottom-5 left-5 right-5 text-white">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-90">
                  {items[1]!.brand}
                </div>
                <div className="mt-1 text-lg font-bold leading-tight md:text-xl">
                  {pickLocale(items[1]!.name, locale)}
                </div>
                <div className="mt-2 inline-flex items-center gap-2">
                  <span className="text-xl font-black">
                    {items[1]!.price.toLocaleString('en-US').replace(/,/g, ' ')}{' '}
                    {common('currency')}
                  </span>
                </div>
              </div>
            </div>
          </article>
        </Link>

        {/* Card 3 — o'ng, qiya teskari, biroz pastroqda */}
        <Link href={`/product/${items[2]!.slug}`} className="col-span-6 mt-4 md:col-span-4 md:mt-0">
          <article className="editorial-card tilt-right">
            <div className="relative aspect-[3/4] bg-white">
              <Image
                src={productImage(items[2]!.imageSeed, 600)}
                alt={pickLocale(items[2]!.name, locale)}
                fill
                sizes="(max-width: 768px) 45vw, 320px"
                className="object-cover"
              />
              <div className="bg-brand-gold absolute right-3 top-3 h-1.5 w-8 rounded-full" />
            </div>
            <div className="bg-white p-4">
              <div className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                {items[2]!.brand}
              </div>
              <div className="text-foreground mt-1 line-clamp-1 text-sm font-bold">
                {pickLocale(items[2]!.name, locale)}
              </div>
              <div className="text-brand-bordeaux mt-1.5 text-base font-black">
                {items[2]!.price.toLocaleString('en-US').replace(/,/g, ' ')} {common('currency')}
              </div>
            </div>
          </article>
        </Link>
      </div>

      {/* CTA — markaz, bordo pill */}
      <div className="relative mt-12 flex justify-center md:mt-16">
        <Button
          asChild
          size="lg"
          className="bg-bordeaux-gradient shadow-bordeaux rounded-full px-8 font-semibold text-white hover:opacity-95"
        >
          <Link href={ctaHref}>
            {t('cta')}
            <ArrowRight size={16} className="ml-1.5" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
