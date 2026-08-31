import { SectionTitle } from '@ecom/ui';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import { CategoryGrid } from '../../components/layout/category-grid';
import { FeaturedCollection } from '../../components/layout/featured-collection';
import { PromoBanner } from '../../components/layout/promo-banner';
import { QuickTiles } from '../../components/layout/quick-tiles';
import { SaleSection } from '../../components/layout/sale-section';
import { SellerBanner } from '../../components/layout/seller-banner';
import { Testimonials } from '../../components/layout/testimonials';
import { ProductCardClient } from '../../components/product/product-card-client';
import { InstallHeroCard } from '../../components/pwa/sticky-install-bar';
import { fetchHomeProducts } from '../../lib/catalog';
import { brands, type Locale } from '../../lib/mock-data';

// ISR — har 2 daqiqada DB'dan yangilanadi (Neon serverless'ni tejaydi)
export const revalidate = 120;

export default async function HomePage() {
  const locale = (await getLocale()) as Locale;
  const { featured, collection, sale } = await fetchHomeProducts();
  const t = await getTranslations('home');

  return (
    <div className="space-y-10 md:space-y-16">
      {/* 1. Banner + yon kartalar — 260px, konteyner ichida.
             Oldin bu yerda 620px to'liq kenglikdagi HeroSection va TrustStrip turardi;
             ikkalasi birgalikda mahsulotlarni ikkinchi ekranga surib yuborardi. */}
      <div className="space-y-2.5">
        <PromoBanner saleProducts={sale} />

        {/* 2. Xizmat va'dalari — raqamsiz, tekshirilishi mumkin */}
        <QuickTiles />
      </div>

      {/* 3. Mahsulotlar — birinchi ekranda ko'rinishi uchun yuqoriga ko'chirildi */}
      <section>
        <div className="mb-7 flex items-end justify-between">
          <div>
            <div className="text-primary text-[11.5px] font-bold uppercase tracking-[0.2em]">
              {t('bestSellersEyebrow')}
            </div>
            <h2 className="text-brand-ink mt-2 font-serif text-2xl font-semibold md:text-[32px]">
              {t('bestSellersTitle')}
            </h2>
          </div>
          <Link
            href="/catalog?sort=popularity"
            className="text-primary border-primary border-b-[1.5px] pb-0.5 text-[13.5px] font-semibold"
          >
            {t('viewAllLong')}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {featured.map((p) => (
            <ProductCardClient key={p.id} product={p} locale={locale} />
          ))}
        </div>
      </section>

      {/* 4. Kategoriyalar — endi mahsulotlardan keyin */}
      <CategoryGrid locale={locale} />

      {/* 5. Featured collection — editorial 3-image showcase */}
      <FeaturedCollection locale={locale} products={collection} />

      {/* 6. Sale section with countdown */}
      <SaleSection locale={locale} saleProducts={sale} />

      {/* 7. Seller CTA banner — million customers reach, perks list */}
      <SellerBanner />

      {/* 8. Testimonials — social proof */}
      <Testimonials />

      {/* 9. PWA install CTA */}
      <InstallHeroCard />

      {/* 10. Brands */}
      <section className="space-y-5">
        <SectionTitle title={t('popularBrands')} description={`Sellobay × ${brands.length}+`} />
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
