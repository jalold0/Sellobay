import { SectionTitle } from '@ecom/ui';
import Link from 'next/link';
import { useLocale } from 'next-intl';

import { CategoryGrid } from '../../components/layout/category-grid';
import { HeroSection } from '../../components/layout/hero-section';
import { SaleSection } from '../../components/layout/sale-section';
import { ProductCardClient } from '../../components/product/product-card-client';
import { InstallHeroCard } from '../../components/pwa/sticky-install-bar';
import { brands, products, type Locale } from '../../lib/mock-data';

export default function HomePage() {
  const locale = useLocale() as Locale;
  const heroProducts = products.slice(0, 4);
  const featured = products.slice(0, 8);
  const sale = products.filter((p) => p.badge === 'SALE' || p.badge === 'TOP').slice(0, 8);

  return (
    <div className="space-y-12 md:space-y-16">
      {/* TZ §2: Hero + stats bar */}
      <HeroSection locale={locale} heroProducts={heroProducts} />

      {/* PWA install CTA */}
      <InstallHeroCard />

      {/* TZ §3: Categories with per-category colors */}
      <CategoryGrid locale={locale} />

      {/* TZ §4: Featured products */}
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

      {/* TZ §5: Sale section with countdown */}
      <SaleSection locale={locale} saleProducts={sale} />

      {/* Brands */}
      <section className="space-y-5">
        <SectionTitle title="Mashhur brendlar" description="Eng yaxshi brendlar bizda" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/catalog?brand=${b.slug}`}
              className="bg-card text-foreground hover:border-primary group relative grid aspect-[3/2] place-items-center overflow-hidden rounded-2xl border font-bold tracking-[0.2em] transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="relative z-10 text-sm transition-transform group-hover:scale-110">
                {b.logoText}
              </span>
              <div className="from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-primary/10 absolute inset-0 bg-gradient-to-br transition-colors" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
