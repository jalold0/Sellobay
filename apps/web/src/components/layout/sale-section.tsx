'use client';

import { Button } from '@ecom/ui';
import { ArrowRight, Flame } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import * as React from 'react';

import { type Locale, type MockProduct, productImage } from '../../lib/mock-data';
import { ProductCardClient } from '../product/product-card-client';

interface Props {
  locale: Locale;
  saleProducts: MockProduct[];
}

// TZ §5: Aksiyalar bloki — gradient banner + qizil chegarali kartalar
//
// Ilgari bu yerda taymer turardi: `Date.now() + 3 kun 14 soat 22 daqiqa`, ya'ni
// nishon vaqti HAR SAHIFA YUKLANISHIDA qaytadan hisoblanardi. Natijada
// hisoblagich hech qachon tugamasdi va har bir mijozga abadiy "3 kun qoldi"
// ko'rsatardi. Ortida hech qanday aksiya yozuvi yo'q edi (bazada aksiya
// oynasi maydoni ham yo'q), shuning uchun taymer olib tashlandi.
export function SaleSection({ locale, saleProducts }: Props) {
  const t = useTranslations('sale');

  // Banner sarlavhasidagi foiz — mahsulotlardan HISOBLANADI. Ilgari u
  // tarjimada "−70%" deb qotib yozilgan edi, holbuki eng katta chegirma
  // 20% atrofida edi.
  const maxDiscount = React.useMemo(
    () =>
      saleProducts.reduce((max, p) => {
        if (!p.oldPrice || p.oldPrice <= p.price) return max;
        return Math.max(max, Math.round(100 - (p.price / p.oldPrice) * 100));
      }, 0),
    [saleProducts],
  );

  return (
    <section className="space-y-6">
      {/* Header with countdown */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-primary mb-2 inline-flex items-center gap-2 text-[11.5px] font-bold uppercase tracking-[0.2em]">
            <Flame size={12} className="flash-glow" />
            {t('flashSale')}
          </div>
          <h2 className="text-brand-ink font-serif text-2xl font-semibold md:text-[32px]">
            {t('homeTitle')}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">{t('limitedTime')}</p>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
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
              <Flame size={12} /> {t('badge')}
            </div>
            <h3 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
              {'−' + maxDiscount + '%'}
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
                  src={productImage(p.imageSeed)}
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {saleProducts.map((p) => (
          <div key={p.id} className="relative">
            <ProductCardClient product={p} locale={locale} stockLeft={p.stock} />
          </div>
        ))}
      </div>
    </section>
  );
}
