import { SectionTitle } from '@ecom/ui';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import { CategoryGrid } from '../../components/layout/category-grid';
import { FeaturedCollection } from '../../components/layout/featured-collection';
import { PromoBanner } from '../../components/layout/promo-banner';
import { QuickTiles } from '../../components/layout/quick-tiles';
import { SaleSection } from '../../components/layout/sale-section';
import { SellerBanner } from '../../components/layout/seller-banner';
import { ProductCardClient } from '../../components/product/product-card-client';
import { InstallHeroCard } from '../../components/pwa/sticky-install-bar';
import { fetchBrands, fetchHomeProducts, fetchStorefrontCategories } from '../../lib/catalog';

import type { Locale } from '../../lib/mock-data';

// ISR — har 2 daqiqada DB'dan yangilanadi (Neon serverless'ni tejaydi)
export const revalidate = 120;

export default async function HomePage() {
  const locale = (await getLocale()) as Locale;
  // Ikki so'rov parallel — kategoriyalar mahsulotlarni kutib turmaydi.
  const [{ featured, sale }, categories, brands] = await Promise.all([
    fetchHomeProducts(),
    fetchStorefrontCategories(),
    fetchBrands(),
  ]);
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
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4 xl:grid-cols-5">
          {featured.map((p) => (
            <ProductCardClient key={p.id} product={p} locale={locale} />
          ))}
        </div>
      </section>

      {/* 4. Kategoriyalar — endi mahsulotlardan keyin */}
      <CategoryGrid locale={locale} categories={categories} />

      {/* 5. Aksiya — editorialdan OLDIN: xarid niyati bilan kelgan odam
          chegirmalarni birinchi ekrandan keyin darrov ko'rishi kerak. */}
      <SaleSection locale={locale} saleProducts={sale} />

      {/* 6. Editorial kolleksiya — brend hikoyasi, xariddan keyin */}
      <FeaturedCollection saleProducts={sale} />

      {/* 7. Brendlar — navigatsiya bloki, CTA'lardan oldin.
             Bazadagi aktiv brendlar. Ilgari bu yerda mock-data'dan 8 ta qotib
             yozilgan brend turardi (GUCCI, PRADA...) va sarlavhada
             "Sellobay × 8+" deb ko'rsatilardi — "+" ma'lumotni kattalashtirib
             ko'rsatardi, bazadagi haqiqiy brend esa ro'yxatga tushmasdi. */}
      {brands.length > 0 ? (
        <section className="space-y-5">
          <SectionTitle
            title={t('popularBrands')}
            description={t('brandsCount', { count: brands.length })}
          />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {brands.map((b) => (
              <Link
                key={b.id}
                href={`/catalog?brand=${b.slug}`}
                className="bg-card text-foreground hover:border-brand-bordeaux group relative grid aspect-[3/2] place-items-center overflow-hidden rounded-2xl border px-2 text-center font-bold tracking-[0.15em] transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="relative z-10 text-sm uppercase transition-transform group-hover:scale-110">
                  {b.name}
                </span>
                <div className="from-brand-bordeaux/0 to-brand-bordeaux/0 group-hover:from-brand-bordeaux/5 group-hover:to-brand-bordeaux/10 absolute inset-0 bg-gradient-to-br transition-colors" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/*
        Mijoz fikrlari bo'limi OLIB TASHLANDI.
        U uchta o'ylab topilgan odamni ko'rsatardi: ismlari (Madina Karimova,
        Akmal Yusupov, Nilufar Rashidova), Unsplash'dan olingan begona
        odamlarning suratlari, 5 yulduz va "2 yildan beri faqat shu yerdan
        olaman" kabi gaplar. Platformada esa 9 ta mijoz bor.
        Haqiqiy sharh tizimi ishga tushgach, shu yerga HAQIQIY fikrlar qo'yiladi.
      */}

      {/* 8. Sotuvchi CTA */}
      <SellerBanner />

      {/* 9. PWA install CTA */}
      <InstallHeroCard />
    </div>
  );
}
