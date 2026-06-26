'use client';

import { Button } from '@ecom/ui';
import { ArrowRight, Flame, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import * as React from 'react';

import { type Locale, type MockProduct } from '../../lib/mock-data';
import { ProductCardClient } from '../product/product-card-client';
import { CountdownTimer } from './countdown-timer';

interface Props {
  locale: Locale;
  saleProducts: MockProduct[];
}

// TZ §5: Aksiyalar bloki — countdown + gradient banner + qizil chegarali kartalar
export function SaleSection({ locale, saleProducts }: Props) {
  const t = useTranslations('sale');
  const endTime = React.useMemo(() => Date.now() + (3 * 86_400 + 14 * 3600 + 22 * 60) * 1000, []);

  return (
    <section className="space-y-6">
      {/* Header with countdown */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="bg-brand-orange/15 text-brand-orange mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider">
            <Flame size={12} className="flash-glow" />
            {t('flashSale')}
          </div>
          <h2 className="text-2xl font-black tracking-tight md:text-3xl">{t('homeTitle')}</h2>
          <p className="text-muted-foreground mt-1 text-sm">{t('limitedTime')}</p>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          <CountdownTimer endTime={endTime} />
          <Link
            href="/sale"
            className="text-primary inline-flex items-center gap-1 text-sm font-semibold hover:underline"
          >
            {t('viewAll')} <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Gradient banner — chap CTA + o'ng carousel */}
      <div className="from-brand-red-dark via-secondary to-brand-dark relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 md:p-10">
        {/* Geometric SVG pattern */}
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full opacity-[0.07]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="sale-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M0 30 L30 0 L60 30 L30 60 Z" fill="none" stroke="white" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#sale-pattern)" />
        </svg>

        <div className="relative grid items-center gap-6 md:grid-cols-2">
          <div className="text-white">
            <div className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest">
              <Zap size={12} /> {t('limitedTimeShort')}
            </div>
            <h3 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
              {t('bannerHeadline1')}
              <br />
              <span className="from-brand-orange bg-gradient-to-r to-white bg-clip-text text-transparent">
                {t('bannerHeadline2')}
              </span>
            </h3>
            <p className="mt-3 max-w-md text-white/85">{t('bannerSubtitle')}</p>
            <Button
              asChild
              size="lg"
              className="text-foreground mt-5 rounded-full bg-white px-6 font-semibold hover:bg-white/90"
            >
              <Link href="/sale">
                {t('bannerCta')} <ArrowRight size={16} className="ml-1" />
              </Link>
            </Button>
          </div>

          {/* O'ng tomon — 2x2 product preview */}
          <div className="hidden grid-cols-2 gap-2 md:grid">
            {saleProducts.slice(0, 4).map((p) => (
              <div
                key={p.id}
                className="relative aspect-square overflow-hidden rounded-xl border border-white/20 bg-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://picsum.photos/seed/${p.imageSeed}/300/300`}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute inset-x-2 bottom-2 text-white">
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    {p.brand}
                  </div>
                  <div className="text-[11px] font-semibold leading-tight">
                    −{Math.round(100 - (p.price / (p.oldPrice ?? p.price * 1.3)) * 100)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sale products grid — qizil chegara va katta chegirma badge bilan */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {saleProducts.map((p, i) => (
          <div key={p.id} className="relative">
            <ProductCardClient product={p} locale={locale} stockLeft={3 + (i % 5)} />
          </div>
        ))}
      </div>
    </section>
  );
}
