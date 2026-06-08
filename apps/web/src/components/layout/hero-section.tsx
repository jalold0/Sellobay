import { Button } from '@ecom/ui';
import { ChevronRight, ShieldCheck, Sparkles, Truck, Undo2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import { pickLocale, productImage, type Locale, type MockProduct } from '../../lib/mock-data';

interface Props {
  locale: Locale;
  heroProducts: MockProduct[]; // 4 ta — bento grid uchun
}

// TZ §2: Hero — gradient + bento-grid 4 ta rasm + heading animation + stats bar
export function HeroSection({ locale, heroProducts }: Props) {
  return (
    <>
      <section className="bg-hero-gradient relative overflow-hidden rounded-3xl px-6 py-12 text-white md:px-12 md:py-16">
        {/* Subtle background orbs */}
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        {/* SVG grid pattern overlay — subtle */}
        <svg
          className="absolute inset-0 h-full w-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <defs>
            <pattern id="hero-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hero-grid)" />
        </svg>

        <div className="relative grid items-center gap-10 md:grid-cols-[55%_45%]">
          {/* Left — text */}
          <div className="space-y-6">
            {/* Glass badge — TZ §2 */}
            <span className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide">
              <Sparkles size={12} /> YANGI KOLLEKSIYA 2026
            </span>

            {/* Heading with fade-up animation */}
            <h1 className="fade-up text-4xl font-black leading-[1.05] tracking-tight md:text-6xl lg:text-7xl">
              O&apos;zbekistondagi
              <br />
              eng katta
              <br />
              <span className="bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
                moda va go&apos;zallik
              </span>
              <br />
              bozori
            </h1>

            <p className="max-w-md text-base text-white/85 md:text-lg">
              Kiyim-kechak, poyabzal, atirlar, kosmetika va aksessuarlar — bitta joyda. Tezkor
              yetkazib berish va 14 kunda qaytarish.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                asChild
                size="lg"
                className="text-foreground rounded-full bg-white px-6 font-semibold shadow-lg hover:scale-[1.02] hover:bg-white/95"
              >
                <Link href="/catalog">
                  Katalogni ochish
                  <ChevronRight size={18} className="ml-1" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 bg-white/0 px-6 font-semibold text-white hover:border-white hover:bg-white/15 hover:text-white"
              >
                <Link href="/sale">🔥 Aksiyalar</Link>
              </Button>
            </div>
          </div>

          {/* Right — Bento grid: 4 ta rasm asimmetrik */}
          <div className="hidden md:block">
            <div className="grid grid-cols-2 gap-3">
              {heroProducts.slice(0, 4).map((p, i) => (
                <div
                  key={p.id}
                  className={
                    'relative overflow-hidden rounded-2xl shadow-2xl transition-transform duration-500 hover:scale-[1.03] ' +
                    // Bento: 1 va 4 — tall, 2 va 3 — short
                    (i === 0 || i === 3 ? 'aspect-[3/4]' : 'aspect-[4/5]') +
                    (i === 1 ? ' translate-y-4' : '') +
                    (i === 2 ? ' -translate-y-4' : '')
                  }
                >
                  <Image
                    src={productImage(p.imageSeed, 600)}
                    alt={pickLocale(p.name, locale)}
                    fill
                    sizes="(max-width: 1024px) 30vw, 250px"
                    className="object-cover"
                    priority={i < 2}
                  />
                  {/* Gradient overlay for depth */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TZ §2: Stats bar — ostida alohida oq strip */}
      <section className="-mt-6 grid grid-cols-2 gap-3 px-3 md:grid-cols-4">
        {[
          { icon: Truck, title: 'Tezkor yetkazib berish', desc: '24 soat ichida' },
          { icon: Undo2, title: '14 kun qaytarish', desc: 'Hech qanday savol-javobsiz' },
          { icon: ShieldCheck, title: '100% asl mahsulot', desc: 'Rasmiy distribyutorlar' },
          { icon: Sparkles, title: 'Sodiqlik dasturi', desc: 'Har xariddan ball' },
        ].map((b) => (
          <div
            key={b.title}
            className="bg-card flex items-start gap-3 rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="bg-primary/10 text-primary grid h-10 w-10 shrink-0 place-items-center rounded-xl">
              <b.icon size={20} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold leading-tight">{b.title}</div>
              <div className="text-muted-foreground mt-0.5 text-xs">{b.desc}</div>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
