import { ChevronRight, Filter, Grid3x3, SlidersHorizontal, Tag, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';

import { ProductCardClient } from '../../../components/product/product-card-client';
import { fetchProducts } from '../../../lib/catalog';
import { brands, categories, findBySlug, pickLocale, type Locale } from '../../../lib/mock-data';

interface CatalogPageProps {
  searchParams: { category?: string; brand?: string; sort?: string; q?: string };
}

export const dynamic = 'force-dynamic';

const CATEGORY_HERO: Record<string, string> = {
  clothing:
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=85&auto=format&fit=crop',
  shoes:
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1600&q=85&auto=format&fit=crop',
  perfume:
    'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1600&q=85&auto=format&fit=crop',
  cosmetics:
    'https://images.unsplash.com/photo-1522335789203-aaa2017ddf5b?w=1600&q=85&auto=format&fit=crop',
  beauty:
    'https://images.unsplash.com/photo-1487412840181-f63f62d6a4b4?w=1600&q=85&auto=format&fit=crop',
  accessories:
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1600&q=85&auto=format&fit=crop',
};

const DEFAULT_HERO =
  'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=85&auto=format&fit=crop';

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

  const heroImage = selectedCategory
    ? (CATEGORY_HERO[selectedCategory.slug] ?? DEFAULT_HERO)
    : DEFAULT_HERO;
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
    <div className="space-y-8">
      <section className="relative -mx-4 overflow-hidden md:-mx-6 lg:-mx-8 xl:mx-0 xl:rounded-3xl">
        <div className="relative h-[280px] md:h-[340px]">
          <Image src={heroImage} alt={title} fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-end">
            <div className="mx-auto w-full max-w-7xl px-6 pb-7 md:px-10 md:pb-10">
              <nav className="mb-3 flex flex-wrap items-center gap-2 text-xs text-white/75">
                <Link href="/" className="hover:text-white">
                  {product('breadcrumbHome')}
                </Link>
                <ChevronRight size={12} />
                <Link href="/catalog" className="hover:text-white">
                  {product('breadcrumbCatalog')}
                </Link>
                {selectedCategory ? (
                  <>
                    <ChevronRight size={12} />
                    <span className="text-white">{pickLocale(selectedCategory.name, locale)}</span>
                  </>
                ) : null}
                {selectedBrand ? (
                  <>
                    <ChevronRight size={12} />
                    <span className="text-white">{selectedBrand.name}</span>
                  </>
                ) : null}
              </nav>

              <div className="flex items-end justify-between gap-3">
                <div>
                  {selectedCategory ? (
                    <span className="text-brand-gold mb-2 inline-block text-[11px] font-bold uppercase tracking-[0.18em]">
                      {selectedCategory.emoji} {t('categoryEyebrow')}
                    </span>
                  ) : null}
                  <h1 className="font-display text-3xl font-black leading-tight tracking-tight text-white md:text-5xl">
                    {title}
                  </h1>
                  <p className="mt-2 text-sm text-white/80 md:text-base">
                    {t('results', { count: list.length.toLocaleString() })} · {t('fromPremium')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {hasFilters ? (
            <>
              <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                {t('filtersLabel')}
              </span>
              {selectedCategory ? (
                <Link
                  href={buildUrlWithout('category')}
                  className="border-border bg-card hover:border-brand-bordeaux inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition"
                >
                  {selectedCategory.emoji} {pickLocale(selectedCategory.name, locale)}
                  <X size={11} className="text-muted-foreground" />
                </Link>
              ) : null}
              {selectedBrand ? (
                <Link
                  href={buildUrlWithout('brand')}
                  className="border-border bg-card hover:border-brand-bordeaux inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition"
                >
                  <Tag size={11} />
                  {selectedBrand.name}
                  <X size={11} className="text-muted-foreground" />
                </Link>
              ) : null}
              {searchParams.q ? (
                <Link
                  href={buildUrlWithout('q')}
                  className="border-border bg-card hover:border-brand-bordeaux inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition"
                >
                  &quot;{searchParams.q}&quot;
                  <X size={11} className="text-muted-foreground" />
                </Link>
              ) : null}
              <Link
                href="/catalog"
                className="text-brand-bordeaux ml-1 text-xs font-semibold hover:underline"
              >
                {t('clearAll')}
              </Link>
            </>
          ) : (
            <div className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
              <Grid3x3 size={14} />
              <span>{t('results', { count: list.length })}</span>
            </div>
          )}
        </div>

        <form className="flex items-center gap-2">
          <label
            htmlFor="sort"
            className="text-muted-foreground inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider"
          >
            <SlidersHorizontal size={12} />
            {t('sort')}
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={searchParams.sort ?? 'popularity'}
            className="border-border bg-card focus:border-brand-bordeaux h-9 rounded-lg border px-3 text-sm font-medium outline-none transition"
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={SORT_VALUES[key]}>
                {t(`sortBy.${key}`)}
              </option>
            ))}
          </select>
          {Object.entries(searchParams).map(([k, v]) =>
            k !== 'sort' && v ? <input key={k} type="hidden" name={k} value={v} /> : null,
          )}
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="bg-card border-border space-y-6 rounded-2xl border p-5">
            <div className="flex items-center justify-between">
              <h2 className="inline-flex items-center gap-2 font-bold">
                <Filter size={16} className="text-brand-bordeaux" />
                {t('filters')}
              </h2>
              {hasFilters ? (
                <Link
                  href="/catalog"
                  className="text-brand-bordeaux text-xs font-semibold hover:underline"
                >
                  {t('reset')}
                </Link>
              ) : null}
            </div>

            <FilterGroup title={t('category')}>
              <ul className="space-y-1">
                {categories.map((c) => {
                  const active = c.slug === searchParams.category;
                  return (
                    <li key={c.id}>
                      <Link
                        href={active ? '/catalog' : `/catalog?category=${c.slug}`}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                          active
                            ? 'bg-brand-bordeaux font-semibold text-white'
                            : 'hover:bg-accent text-foreground'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">{c.emoji}</span>
                          {pickLocale(c.name, locale)}
                        </span>
                        <span
                          className={`text-xs ${active ? 'text-white/80' : 'text-muted-foreground'}`}
                        >
                          {c.productCount}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </FilterGroup>

            <FilterGroup title={t('brand')}>
              <ul className="grid grid-cols-2 gap-1.5">
                {brands.slice(0, 8).map((b) => {
                  const active = b.slug === searchParams.brand;
                  return (
                    <li key={b.id}>
                      <Link
                        href={active ? '/catalog' : `/catalog?brand=${b.slug}`}
                        className={`block truncate rounded-lg px-2.5 py-1.5 text-center text-xs font-medium transition ${
                          active
                            ? 'bg-brand-bordeaux text-white'
                            : 'border-border hover:border-brand-bordeaux bg-background border'
                        }`}
                      >
                        {b.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </FilterGroup>

            <FilterGroup title={t('priceRange')}>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={t('priceFrom')}
                  className="border-border bg-background focus:border-brand-bordeaux h-9 w-full rounded-lg border px-3 text-sm outline-none"
                />
                <span className="text-muted-foreground">—</span>
                <input
                  type="number"
                  placeholder={t('priceTo')}
                  className="border-border bg-background focus:border-brand-bordeaux h-9 w-full rounded-lg border px-3 text-sm outline-none"
                />
              </div>
            </FilterGroup>

            <FilterGroup title={t('filters')}>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="border-input accent-brand-bordeaux h-4 w-4 rounded"
                    defaultChecked
                  />
                  {t('inStock')}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="border-input accent-brand-bordeaux h-4 w-4 rounded"
                  />
                  {t('discount')}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="border-input accent-brand-bordeaux h-4 w-4 rounded"
                  />
                  {t('freeShipping')}
                </label>
              </div>
            </FilterGroup>
          </div>
        </aside>

        <div>
          {list.length === 0 ? (
            <div className="bg-card border-border rounded-2xl border p-16 text-center">
              <div className="bg-muted mx-auto grid h-16 w-16 place-items-center rounded-full">
                <Filter className="text-muted-foreground h-7 w-7" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{t('noResults')}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{t('noResultsHint')}</p>
              <Link
                href="/catalog"
                className="bg-bordeaux-gradient mt-5 inline-flex rounded-lg px-5 py-2 text-sm font-semibold text-white"
              >
                {t('allProducts')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
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
      <div className="text-muted-foreground mb-2.5 text-[11px] font-bold uppercase tracking-[0.12em]">
        {title}
      </div>
      {children}
    </div>
  );
}
