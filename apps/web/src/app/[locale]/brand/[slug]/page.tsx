import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import { ProductCardClient } from '../../../../components/product/product-card-client';
import { brands, findBySlug, type Locale, products } from '../../../../lib/mock-data';

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const t = await getTranslations('brand');
  const brand = findBySlug(brands, params.slug);
  if (!brand) return { title: t('notFound') };
  return { title: brand.name, description: t('metaDescription', { name: brand.name }) };
}

export default async function BrandPage({ params }: PageProps) {
  const brand = findBySlug(brands, params.slug);
  if (!brand) notFound();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('brand');
  const brandProducts = products.filter((p) => p.brandId === brand.id);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-700 px-6 py-12 text-white">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div
              className="text-3xl font-black tracking-[0.3em] md:text-5xl"
              style={{ letterSpacing: '0.3em' }}
            >
              {brand.logoText}
            </div>
            <p className="mt-3 max-w-md text-white/80">{t('heroSubtitle', { name: brand.name })}</p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
            <div className="text-xs uppercase tracking-wide opacity-70">{t('productsLabel')}</div>
            <div className="text-3xl font-bold">{brandProducts.length}</div>
          </div>
        </div>
      </section>

      <section>
        {brandProducts.length === 0 ? (
          <div className="bg-card text-muted-foreground rounded-xl border p-10 text-center">
            {t('empty', { name: brand.name })}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {brandProducts.map((p) => (
              <ProductCardClient key={p.id} product={p} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
