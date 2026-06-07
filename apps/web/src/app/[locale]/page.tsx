import { Button, CategoryCard, SectionTitle } from '@ecom/ui';
import { ChevronRight, ShieldCheck, Sparkles, Truck, Undo2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from 'next-intl';

import { NewsletterForm } from '../../components/layout/newsletter';
import { ProductCardClient } from '../../components/product/product-card-client';
import { brands, categories, pickLocale, productImage, products, type Locale } from '../../lib/mock-data';

export default function HomePage() {
  const locale = useLocale() as Locale;
  const featured = products.slice(0, 8);
  const sale = products.filter((p) => p.badge === 'SALE' || p.badge === 'TOP').slice(0, 4);

  return (
    <div className="space-y-12 md:space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-rose-600 to-orange-500 px-6 py-12 text-primary-foreground md:px-12 md:py-20">
        <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative grid items-center gap-8 md:grid-cols-2">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles size={12} /> Yangi kolleksiya 2026
            </span>
            <h1 className="text-3xl font-black leading-tight tracking-tight md:text-5xl lg:text-6xl">
              O&apos;zbekistondagi eng katta
              <br />
              <span className="text-white/90">moda va go&apos;zallik</span> bozori
            </h1>
            <p className="max-w-md text-base text-white/80 md:text-lg">
              Kiyim-kechak, poyabzal, atirlar, kosmetika va aksessuarlar — bitta joyda. Tezkor yetkazib berish va 14
              kunda qaytarish.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary" className="font-semibold">
                <Link href="/catalog">
                  Katalogni ochish
                  <ChevronRight size={18} className="ml-1" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/0 text-white hover:bg-white/15 hover:text-white"
              >
                <Link href="/sale">🔥 Aksiyalar</Link>
              </Button>
            </div>
          </div>
          <div className="hidden grid-cols-2 gap-3 md:grid">
            {featured.slice(0, 4).map((p, i) => (
              <div
                key={p.id}
                className={`relative aspect-square overflow-hidden rounded-2xl shadow-xl ${
                  i === 0 || i === 3 ? 'rotate-[-3deg]' : 'rotate-[3deg]'
                }`}
              >
                <Image
                  src={productImage(p.imageSeed, 400)}
                  alt={pickLocale(p.name, locale)}
                  fill
                  sizes="(max-width: 1024px) 25vw, 200px"
                  className="object-cover"
                  priority={i < 2}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: Truck, title: 'Tezkor yetkazib berish', desc: '24 soat ichida' },
          { icon: Undo2, title: '14 kun qaytarish', desc: 'Hech qanday savol-javobsiz' },
          { icon: ShieldCheck, title: '100% asl mahsulot', desc: 'Rasmiy distribyutorlar' },
          { icon: Sparkles, title: 'Sodiqlik dasturi', desc: 'Har xariddan ball' },
        ].map((b) => (
          <div key={b.title} className="flex items-start gap-3 rounded-xl border bg-card p-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <b.icon size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold">{b.title}</div>
              <div className="text-xs text-muted-foreground">{b.desc}</div>
            </div>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section className="space-y-5">
        <SectionTitle
          title="Kategoriyalar"
          description="Sevimli kategoriyangizni tanlang"
          actionHref="/catalog"
          actionLabel="Barchasi"
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {categories.map((c) => (
            <CategoryCard
              key={c.id}
              name={pickLocale(c.name, locale)}
              emoji={c.emoji}
              imageUrl={productImage(c.imageSeed, 300)}
              href={`/catalog?category=${c.slug}`}
              productCount={c.productCount}
            />
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="space-y-5">
        <SectionTitle
          title="Eng ko'p sotilganlar"
          description="Bizning bestseller'larimiz"
          actionHref="/catalog?sort=popularity"
          actionLabel="Barchasi"
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCardClient key={p.id} product={p} locale={locale} />
          ))}
        </div>
      </section>

      {/* Sale strip */}
      <section className="space-y-5">
        <SectionTitle title="🔥 Aksiyada" description="Cheklangan vaqt — chegirma" actionHref="/sale" actionLabel="Barchasi" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {sale.map((p) => (
            <ProductCardClient key={p.id} product={p} locale={locale} />
          ))}
        </div>
      </section>

      {/* Brands */}
      <section className="space-y-5">
        <SectionTitle title="Mashhur brendlar" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/catalog?brand=${b.slug}`}
              className="grid aspect-[3/2] place-items-center rounded-xl border bg-card font-bold tracking-wider text-foreground transition hover:border-primary hover:shadow"
              style={{ letterSpacing: '0.2em' }}
            >
              {b.logoText}
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="rounded-3xl bg-gradient-to-br from-secondary to-muted p-6 md:p-10">
        <div className="grid items-center gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">
              Yangi tushgan mahsulotlardan birinchi bo&apos;lib xabardor bo&apos;ling
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Emailingizni qoldiring va doimiy mijoz uchun 10% chegirma kupon oling.
            </p>
          </div>
          <NewsletterForm />
        </div>
      </section>
    </div>
  );
}
