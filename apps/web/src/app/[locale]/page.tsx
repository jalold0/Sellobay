import { Button, CategoryCard, ProductCard, SectionTitle } from '@ecom/ui';
import { ChevronRight, ShieldCheck, Sparkles, Truck, Undo2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';

import {
  brands,
  categories,
  pickLocale,
  productImage,
  products,
  type Locale,
} from '../../lib/mock-data';

export default function HomePage() {
  const t = useTranslations('product');
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
              Kiyim-kechak, poyabzal, atirlar, kosmetika va aksessuarlar — bitta joyda. Tezkor yetkazib berish va 14 kunda qaytarish.
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
                className={`aspect-square overflow-hidden rounded-2xl shadow-xl ${
                  i === 0 || i === 3 ? 'rotate-[-3deg]' : 'rotate-[3deg]'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={productImage(p.imageSeed, 300)}
                  alt={pickLocale(p.name, locale)}
                  className="h-full w-full object-cover"
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
            <ProductCard
              key={p.id}
              name={pickLocale(p.name, locale)}
              brand={p.brand}
              imageUrl={productImage(p.imageSeed)}
              href={`/product/${p.slug}`}
              price={p.price}
              oldPrice={p.oldPrice}
              currency={p.currency}
              locale={locale === 'uz' ? 'uz-UZ' : locale === 'ru' ? 'ru-RU' : 'en-US'}
              rating={p.rating}
              reviewCount={p.reviewCount}
              badge={p.badge}
              inStock={p.inStock}
            />
          ))}
        </div>
      </section>

      {/* Sale strip */}
      <section className="space-y-5">
        <SectionTitle title="🔥 Aksiyada" description="Cheklangan vaqt — chegirma" actionHref="/sale" actionLabel="Barchasi" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {sale.map((p) => (
            <ProductCard
              key={p.id}
              name={pickLocale(p.name, locale)}
              brand={p.brand}
              imageUrl={productImage(p.imageSeed)}
              href={`/product/${p.slug}`}
              price={p.price}
              oldPrice={p.oldPrice}
              currency={p.currency}
              rating={p.rating}
              reviewCount={p.reviewCount}
              badge={p.badge}
              inStock={p.inStock}
            />
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
            <h3 className="text-2xl font-bold tracking-tight">Yangi tushgan mahsulotlardan birinchi bo&apos;lib xabardor bo&apos;ling</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Emailingizni qoldiring va doimiy mijoz uchun 10% chegirma kupon oling.
            </p>
          </div>
          <form className="flex gap-2">
            <input
              type="email"
              required
              placeholder="email@example.uz"
              className="h-12 flex-1 rounded-full border border-input bg-background px-5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <Button size="lg" className="rounded-full px-6">
              Obuna bo&apos;lish
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
