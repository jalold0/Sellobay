import { EmptyState } from '@ecom/ui';
import { ChevronDown, Filter, X } from 'lucide-react';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import { FilterPanel } from '../../../components/catalog/filter-panel';
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

const BRANDS_VISIBLE = 6;

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

  const buildUrlWithout = (key: 'category' | 'brand' | 'q') => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (k !== key && v) params.set(k, v);
    });
    const qs = params.toString();
    return `/catalog${qs ? `?${qs}` : ''}`;
  };

  return (
    <div className="space-y-7">
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

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-brand-ink font-serif text-[28px] font-semibold leading-tight md:text-[34px]">
            {title}
          </h1>
          <span className="text-muted-foreground text-[13.5px]">
            {t('results', { count: list.length.toLocaleString() })}
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {hasFilters ? (
            <>
              {selectedCategory ? (
                <Link
                  href={buildUrlWithout('category')}
                  className="bg-soft border-border text-brand-ink hover:border-primary inline-flex items-center gap-2 rounded-full border px-4 py-[7px] text-[12.5px] font-semibold transition"
                >
                  {pickLocale(selectedCategory.name, locale)}
                  <X size={12} className="text-primary" />
                </Link>
              ) : null}
              {selectedBrand ? (
                <Link
                  href={buildUrlWithout('brand')}
                  className="bg-soft border-border text-brand-ink hover:border-primary inline-flex items-center gap-2 rounded-full border px-4 py-[7px] text-[12.5px] font-semibold transition"
                >
                  {selectedBrand.name}
                  <X size={12} className="text-primary" />
                </Link>
              ) : null}
              {searchParams.q ? (
                <Link
                  href={buildUrlWithout('q')}
                  className="bg-soft border-border text-brand-ink hover:border-primary inline-flex items-center gap-2 rounded-full border px-4 py-[7px] text-[12.5px] font-semibold transition"
                >
                  &quot;{searchParams.q}&quot;
                  <X size={12} className="text-primary" />
                </Link>
              ) : null}
              <Link
                href="/catalog"
                className="text-primary ml-1 text-[13px] font-semibold hover:underline"
              >
                {common('clear')}
              </Link>
            </>
          ) : null}
        </div>

        <form className="flex items-center gap-2">
          <label htmlFor="sort" className="sr-only">
            {t('sort')}
          </label>
          <div className="relative">
            <select
              id="sort"
              name="sort"
              defaultValue={searchParams.sort ?? 'popularity'}
              className="border-border text-brand-ink focus:border-primary appearance-none rounded-full border-[1.5px] bg-white py-[9px] pl-[18px] pr-10 text-[13px] font-semibold outline-none transition"
            >
              {SORT_KEYS.map((key) => (
                <option key={key} value={SORT_VALUES[key]}>
                  {t(`sortBy.${key}`)}
                </option>
              ))}
            </select>
            <ChevronDown
              size={15}
              className="text-brand-ink pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"
            />
          </div>
          {Object.entries(searchParams).map(([k, v]) =>
            k !== 'sort' && v ? <input key={k} type="hidden" name={k} value={v} /> : null,
          )}
        </form>
      </div>

      <div className="grid gap-9 lg:grid-cols-[264px_1fr]">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <FilterPanel label={t('filters')}>
            <div className="space-y-7">
              <div className="flex items-baseline justify-between">
                <h2 className="text-brand-ink font-serif text-lg font-semibold">{t('filters')}</h2>
                {hasFilters ? (
                  <Link
                    href="/catalog"
                    className="text-primary text-[13px] font-semibold hover:underline"
                  >
                    {t('reset')}
                  </Link>
                ) : null}
              </div>

              <FilterGroup title={t('category')}>
                <ul className="space-y-2.5">
                  {categories.map((c) => {
                    const active = c.slug === searchParams.category;
                    return (
                      <li key={c.id}>
                        <Link
                          href={active ? '/catalog' : `/catalog?category=${c.slug}`}
                          className="group flex items-center gap-2.5"
                        >
                          <CheckSquare checked={active} />
                          <span
                            className={`flex-1 text-[13.5px] transition-colors ${
                              active
                                ? 'text-brand-ink font-semibold'
                                : 'group-hover:text-brand-ink text-[#3a3a40]'
                            }`}
                          >
                            {pickLocale(c.name, locale)}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </FilterGroup>

              <FilterGroup title={t('brand')}>
                <ul className="space-y-2.5">
                  {brands.slice(0, BRANDS_VISIBLE).map((b) => {
                    const active = b.slug === searchParams.brand;
                    return (
                      <li key={b.id}>
                        <Link
                          href={active ? '/catalog' : `/catalog?brand=${b.slug}`}
                          className="group flex items-center gap-2.5"
                        >
                          <CheckSquare checked={active} />
                          <span
                            className={`flex-1 truncate text-[13.5px] transition-colors ${
                              active
                                ? 'text-brand-ink font-semibold'
                                : 'group-hover:text-brand-ink text-[#3a3a40]'
                            }`}
                          >
                            {b.name}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {brands.length > BRANDS_VISIBLE ? (
                  <details className="group/more mt-2.5">
                    <summary className="text-primary cursor-pointer list-none text-[13px] font-semibold hover:underline group-open/more:hidden [&::-webkit-details-marker]:hidden">
                      {t('brandMore', { count: brands.length - BRANDS_VISIBLE })}
                    </summary>
                    <ul className="space-y-2.5">
                      {brands.slice(BRANDS_VISIBLE).map((b) => {
                        const active = b.slug === searchParams.brand;
                        return (
                          <li key={b.id}>
                            <Link
                              href={active ? '/catalog' : `/catalog?brand=${b.slug}`}
                              className="group flex items-center gap-2.5"
                            >
                              <CheckSquare checked={active} />
                              <span
                                className={`flex-1 truncate text-[13.5px] transition-colors ${
                                  active
                                    ? 'text-brand-ink font-semibold'
                                    : 'group-hover:text-brand-ink text-[#3a3a40]'
                                }`}
                              >
                                {b.name}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ) : null}
              </FilterGroup>

              <FilterGroup title={t('priceHeader')}>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder={t('priceFrom')}
                    aria-label={common('from')}
                    className="border-border focus:border-primary text-brand-ink w-full rounded-[10px] border-[1.5px] px-3 py-2 text-[13px] font-semibold outline-none transition"
                  />
                  <span className="text-[#9a9aa2]">—</span>
                  <input
                    type="number"
                    placeholder={t('priceTo')}
                    aria-label={common('to')}
                    className="border-border focus:border-primary text-brand-ink w-full rounded-[10px] border-[1.5px] px-3 py-2 text-[13px] font-semibold outline-none transition"
                  />
                </div>
              </FilterGroup>

              <FilterGroup title={t('filterOther')}>
                <div className="space-y-2.5">
                  <CheckboxRow label={t('onlyOriginal')} defaultChecked />
                  <CheckboxRow label={t('inDiscount')} />
                  <CheckboxRow label={t('delivery24h')} />
                </div>
              </FilterGroup>
            </div>
          </FilterPanel>
        </aside>

        <div>
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {list.map((p) => (
                <ProductCardClient key={p.id} product={p} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-brand-ink border-border mb-3.5 border-b pb-2.5 text-xs font-extrabold uppercase tracking-[0.12em]">
        {title}
      </div>
      {children}
    </div>
  );
}

function CheckSquare({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[5px] text-[11px] font-extrabold leading-none ${
        checked ? 'bg-primary text-white' : 'border-[1.5px] border-[#d5d5d9]'
      }`}
    >
      {checked ? '✓' : null}
    </span>
  );
}

function CheckboxRow({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5">
      <input type="checkbox" className="peer sr-only" defaultChecked={defaultChecked} />
      <span
        aria-hidden
        className="peer-checked:bg-primary peer-checked:border-primary grid h-[17px] w-[17px] shrink-0 place-items-center rounded-[5px] border-[1.5px] border-[#d5d5d9] text-[11px] font-extrabold leading-none text-transparent transition peer-checked:text-white"
      >
        ✓
      </span>
      <span className="group-hover:text-brand-ink text-[13.5px] text-[#3a3a40] transition-colors">
        {label}
      </span>
    </label>
  );
}
