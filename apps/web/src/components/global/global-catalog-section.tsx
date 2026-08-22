// Global katalog seksiyasi — mijoz Xitoy tovarlarini o'zbekcha ko'radi.
// Server komponent: tovarlar `fetchProducts({ scope: 'GLOBAL' })` orqali keladi,
// ya'ni LOKAL katalogga aralashmaydi (ikkisi bitta jadvalda, qamrov bilan ajratilgan).

import { EmptyState } from '@ecom/ui';
import { PackageSearch } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { fetchProducts } from '../../lib/catalog';
import { ProductCardClient } from '../product/product-card-client';

import type { Locale } from '../../lib/mock-data';

export async function GlobalCatalogSection() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('global.catalog');

  const { items } = await fetchProducts({ scope: 'GLOBAL', sort: 'popularity', limit: 24 });

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl">{t('title')}</h2>
        {items.length > 0 && (
          <span className="text-muted-foreground text-sm">
            {t('count', { count: items.length })}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={PackageSearch} title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <>
          <p className="text-muted-foreground text-sm">{t('note')}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCardClient key={p.id} product={p} locale={locale} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
