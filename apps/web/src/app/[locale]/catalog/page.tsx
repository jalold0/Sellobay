import { EmptyState } from '@ecom/ui';
import { Filter } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import { FilterBar } from '../../../components/catalog/filter-bar';
import { ProductCardClient } from '../../../components/product/product-card-client';
import { fetchProducts } from '../../../lib/catalog';
import { brands, categories, findBySlug, pickLocale, type Locale } from '../../../lib/mock-data';

interface CatalogPageProps {
  searchParams: { category?: string; brand?: string; sort?: string; q?: string };
}

export const dynamic = 'force-dynamic';

const SORT_KEYS = ['popularity', 'newest', 'priceAsc', 'priceDesc', 'rating'] as const;
const SORT_VALUES: Record<(typeof SORT_KEYS)[number], string> = {
  popularity: 'popularity',
  newest: 'newest',
  priceAsc: 'price-asc',
  priceDesc: 'price-desc',
  rating: 'rating',
};

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('catalog');
  const product = await getTranslations('product');
  const common = await getTranslations('common');

  const { items: list } = await fetchProducts({
    category: searchParams.category,
    brand: searchParams.brand,
    q: searchParams.q,
    sort: searchParams.sort,
  });

  const selectedCategory = searchParams.category
    ? findBySlug(categories, searchParams.category)
    : undefined;
  const selectedBrand = searchParams.brand ? findBySlug(brands, searchParams.brand) : undefined;

  const title = selectedCategory
    ? pickLocale(selectedCategory.name, locale)
    : selectedBrand
      ? selectedBrand.name
      : searchParams.q
        ? t('searchResults', { q: searchParams.q })
        : t('title');

  const hasFilters = Boolean(selectedCategory || selectedBrand || searchParams.q);

  return (
    <div className="space-y-6">
      <header className="space-y-3 pt-2">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs text-[#9a9aa2]"
        >
          <Link href="/" className="hover:text-brand-ink transition-colors">
            {product('breadcrumbHome')}
          </Link>
          <span aria-hidden>/</span>
          {hasFilters ? (
            <>
              <Link href="/catalog" className="hover:text-brand-ink transition-colors">
                {product('breadcrumbCatalog')}
              </Link>
              <span aria-hidden>/</span>
              <span className="text-brand-ink font-semibold">{title}</span>
            </>
          ) : (
            <span className="text-brand-ink font-semibold">{product('breadcrumbCatalog')}</span>
          )}
        </nav>

        {/* Sarlavha ATAYLAB sans-serif. Playfair bosh sahifa va editorial
            bloklarda qoladi — u yerda u brend xarakterini beradi. Katalog esa
            ishchi ekran: xaridor bu yerda o'qimaydi, skanerlaydi. */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-brand-ink text-[26px] font-bold leading-tight tracking-[-0.01em] md:text-[30px]">
            {title}
          </h1>
          <span className="text-muted-foreground text-[13.5px]">
            {t('results', { count: list.length.toLocaleString() })}
          </span>
        </div>
      </header>

      <FilterBar
        categories={categories.map((c) => ({ value: c.slug, label: pickLocale(c.name, locale) }))}
        brands={brands.map((b) => ({ value: b.slug, label: b.name }))}
        sorts={SORT_KEYS.map((key) => ({ value: SORT_VALUES[key], label: t(`sortBy.${key}`) }))}
        active={{
          category: searchParams.category,
          brand: searchParams.brand,
          q: searchParams.q,
          sort: searchParams.sort,
        }}
        labels={{
          category: t('category'),
          brand: t('brand'),
          sort: t('sort'),
          clear: common('clear'),
          all: common('all'),
        }}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Filter}
          title={t('noResults')}
          description={t('noResultsHint')}
          action={
            <Link
              href="/catalog"
              className="bg-primary hover:bg-brand-crimson-deep inline-flex rounded-full px-6 py-2.5 text-sm font-semibold text-white transition"
            >
              {t('allProducts')}
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {list.map((p) => (
            <ProductCardClient key={p.id} product={p} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
