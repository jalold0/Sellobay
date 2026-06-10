import { SectionTitle } from '@ecom/ui';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';

import { CategoryGrid } from '../../components/layout/category-grid';
import { FeaturedCollection } from '../../components/layout/featured-collection';
import { HeroSection } from '../../components/layout/hero-section';
import { SaleSection } from '../../components/layout/sale-section';
import { ProductCardClient } from '../../components/product/product-card-client';
import { InstallHeroCard } from '../../components/pwa/sticky-install-bar';
import { fetchHomeProducts } from '../../lib/catalog';
import { brands, type Locale } from '../../lib/mock-data';

// ISR — har 2 daqiqada DB'dan yangilanadi (Neon serverless'ni tejaydi)
export const revalidate = 120;

export default async function HomePage() {
  const locale = (await getLocale()) as Locale;
  // Haqiqiy DB'dan (Neon) — xato bo'lsa avtomatik mock fallback
  const { hero, featured, collection, sale } = await fetchHomeProducts();

  return (
    <div className="space-y-12 md:space-y-20">
      {/* Hero — UMBRA editorial style */}
      <HeroSection locale={locale} heroProducts={hero} />

      {/* Categories with per-category colors */}
      <CategoryGrid locale={locale} />

      {/* Featured products — bestsellers grid */}
      <section className="space-y-5">
        <SectionTitle
          title="Eng ko'p sotilganlar"
          description="Bizning bestseller'larimiz — eng ko'p tanlangan mahsulotlar"
          actionHref="/catalog?sort=popularity"
          actionLabel="Barchasi"
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCardClient key={p.id} product={p} locale={locale} />
          ))}
        </div>
      </section>

      {/* Featured Collection — UMBRA editorial 3-image showcase */}
      <FeaturedCollection
        locale={locale}
        products={collection}
        title="Tanlangan kolleksiya"
        subtitle="Tahririyat tomonidan tanlangan eng yaxshi mahsulotlar — premium sotuvchilardan"
      />

      {/* Sale section with countdown */}
      <SaleSection locale={locale} saleProducts={sale} />

      {/* PWA install CTA */}
      <InstallHeroCard />

      {/* Brands */}
      <section className="space-y-5">
        <SectionTitle title="Mashhur brendlar" description="Eng yaxshi brendlar Sellobay'da" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/catalog?brand=${b.slug}`}
              className="bg-card text-foreground hover:border-brand-bordeaux group relative grid aspect-[3/2] place-items-center overflow-hidden rounded-2xl border font-bold tracking-[0.2em] transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="relative z-10 text-sm transition-transform group-hover:scale-110">
                {b.logoText}
              </span>
              <div className="from-brand-bordeaux/0 to-brand-bordeaux/0 group-hover:from-brand-bordeaux/5 group-hover:to-brand-bordeaux/10 absolute inset-0 bg-gradient-to-br transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
