import { Button } from '@ecom/ui';
import { ArrowRight, Sparkles } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { pickLocale, productImage, type Locale, type MockProduct } from '../../lib/mock-data';

interface Props {
  locale: Locale;
  heroProducts: MockProduct[]; // 3 ta — UMBRA-style staggered editorial
}

// Sellobay Hero — UMBRA editorial inspiration: 3 staggered tilted images + light bg + bordo CTA
export function HeroSection({ locale, heroProducts }: Props) {
  // 3 ta xaqqoniy mahsulot (yo'q bo'lsa fallback)
  const products = heroProducts.slice(0, 3);
  while (products.length < 3 && heroProducts.length > 0) {
    products.push(heroProducts[0]!);
  }

  return (
    <section className="bg-editorial relative overflow-hidden rounded-[2rem] px-4 py-12 md:px-10 md:py-20">
      {/* Subtle decorative orbs — premium soft light */}
      <div className="bg-brand-bordeaux/[0.04] absolute -right-32 -top-32 h-96 w-96 rounded-full blur-3xl" />
      <div className="bg-brand-gold/[0.06] absolute -bottom-32 -left-32 h-80 w-80 rounded-full blur-3xl" />

      {/* ===== Brand bar — UMBRA-style horizontal pill (yuqori markaz) ===== */}
      <div className="relative mx-auto mb-10 flex max-w-3xl items-center justify-between rounded-full border border-white/60 bg-white/90 px-5 py-3 shadow-lg backdrop-blur md:mb-16">
        {/* Sellobay wordmark */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="bg-bordeaux-gradient grid h-9 w-9 place-items-center rounded-xl text-[13px] font-black tracking-tighter text-white shadow-md">
            SB
          </div>
          <span className="text-foreground text-lg font-extrabold tracking-tight">Sellobay</span>
        </Link>

        {/* Center tagline — desktop only */}
        <div className="text-muted-foreground hidden items-center gap-1.5 text-xs font-medium uppercase tracking-[0.15em] md:flex">
          <Sparkles size={12} className="text-brand-gold" />
          Marketplace · 50,000+ sotuvchi
        </div>

        {/* Shop Now CTA — bordo pill */}
        <Button
          asChild
          size="sm"
          className="bg-bordeaux-gradient shadow-bordeaux rounded-full px-5 font-semibold text-white hover:opacity-95"
        >
          <Link href="/catalog">
            Xarid qilish
            <ArrowRight size={14} className="ml-1" />
          </Link>
        </Button>
      </div>

      {/* ===== Editorial heading — markaziy ===== */}
      <div className="relative mx-auto mb-12 max-w-4xl px-4 text-center md:mb-16">
        <span className="text-brand-bordeaux mb-4 inline-block text-[11px] font-bold uppercase tracking-[0.25em]">
          Premium · 2026 Kolleksiya
        </span>
        <h1 className="fade-up text-foreground font-display text-4xl font-black leading-[1.02] tracking-tight md:text-6xl lg:text-7xl">
          Minglab sotuvchilar.
          <br />
          <span className="from-brand-bordeaux via-brand-bordeaux-deep to-brand-black bg-gradient-to-r bg-clip-text text-transparent">
            Yagona platforma.
          </span>
        </h1>
        <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-base md:text-lg">
          O&apos;zbekistondagi eng yirik marketplace. Premium brendlar, mahalliy sotuvchilar va
          tezkor yetkazib berish — bitta joyda.
        </p>
      </div>

      {/* ===== 3 staggered tilted images — UMBRA bento ===== */}
      <div className="relative mx-auto grid max-w-6xl grid-cols-12 items-end gap-3 md:gap-6">
        {/* Image 1 — Chap, kichik, qiya, biroz pastroqda */}
        <Link
          href={`/product/${products[0]?.slug ?? 'featured-1'}`}
          className="col-span-4 -mb-4 md:col-span-3 md:col-start-2 md:-mb-12"
        >
          <div className="editorial-card tilt-left aspect-[3/4] bg-white">
            <Image
              src={productImage(products[0]?.imageSeed ?? 'hero-1', 600)}
              alt={products[0] ? pickLocale(products[0].name, locale) : 'Featured 1'}
              fill
              sizes="(max-width: 768px) 30vw, 250px"
              className="object-cover"
              priority
            />
            <div className="absolute bottom-3 left-3 right-3">
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/90 drop-shadow">
                {products[0]?.brand ?? 'Brand'}
              </div>
            </div>
          </div>
        </Link>

        {/* Image 2 — Markaz, katta, dramatic, dominant */}
        <Link
          href={`/product/${products[1]?.slug ?? 'featured-2'}`}
          className="col-span-8 md:col-span-5"
        >
          <div className="editorial-card aspect-[4/5] bg-white">
            <Image
              src={productImage(products[1]?.imageSeed ?? 'hero-2', 900)}
              alt={products[1] ? pickLocale(products[1].name, locale) : 'Hero product'}
              fill
              sizes="(max-width: 768px) 60vw, 500px"
              className="object-cover"
              priority
            />
            {/* Dramatic overlay for that UMBRA glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

            {/* Brand mark + label */}
            <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
              <div className="text-white">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-90">
                  {products[1]?.brand ?? 'Premium'}
                </div>
                <div className="mt-1 text-base font-bold leading-tight md:text-lg">
                  {products[1] ? pickLocale(products[1].name, locale) : "Eng so'nggi tushgan"}
                </div>
              </div>
              <span className="glass-light text-foreground rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider">
                Ko&apos;rish →
              </span>
            </div>
          </div>
        </Link>

        {/* Image 3 — O'ng, o'rta, biroz qiya teskari */}
        <Link
          href={`/product/${products[2]?.slug ?? 'featured-3'}`}
          className="col-span-4 -mb-6 md:col-span-3 md:-mb-10"
        >
          <div className="editorial-card tilt-right aspect-[3/4] bg-white">
            <Image
              src={productImage(products[2]?.imageSeed ?? 'hero-3', 600)}
              alt={products[2] ? pickLocale(products[2].name, locale) : 'Featured 3'}
              fill
              sizes="(max-width: 768px) 30vw, 250px"
              className="object-cover"
              priority
            />
            <div className="absolute bottom-3 left-3 right-3">
              <div className="text-[9px] font-bold uppercase tracking-widest text-white/90 drop-shadow">
                {products[2]?.brand ?? 'Brand'}
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* ===== Bottom trust micro-stats ===== */}
      <div className="relative mx-auto mt-16 grid max-w-4xl grid-cols-3 gap-4 px-4 md:mt-24">
        <div className="text-center">
          <div className="text-brand-bordeaux text-2xl font-black md:text-3xl">50,000+</div>
          <div className="text-muted-foreground mt-1 text-[10px] font-bold uppercase tracking-widest md:text-xs">
            Sotuvchi
          </div>
        </div>
        <div className="text-center">
          <div className="text-brand-bordeaux text-2xl font-black md:text-3xl">2M+</div>
          <div className="text-muted-foreground mt-1 text-[10px] font-bold uppercase tracking-widest md:text-xs">
            Mahsulot
          </div>
        </div>
        <div className="text-center">
          <div className="text-brand-bordeaux text-2xl font-black md:text-3xl">99.2%</div>
          <div className="text-muted-foreground mt-1 text-[10px] font-bold uppercase tracking-widest md:text-xs">
            Ishonch
          </div>
        </div>
      </div>
    </section>
  );
}
