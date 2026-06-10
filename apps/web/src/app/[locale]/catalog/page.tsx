import { ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';
import { getLocale } from 'next-intl/server';

import { ProductCardClient } from '../../../components/product/product-card-client';
import { fetchProducts } from '../../../lib/catalog';
import { brands, categories, findBySlug, pickLocale, type Locale } from '../../../lib/mock-data';

interface CatalogPageProps {
  searchParams: { category?: string; brand?: string; sort?: string; q?: string };
}

// searchParams ishlatilgani uchun har doim dynamic
export const dynamic = 'force-dynamic';

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const locale = (await getLocale()) as Locale;

  // Haqiqiy DB'dan — filtering/sorting Postgres'da bajariladi
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
        ? `"${searchParams.q}" bo'yicha natijalar`
        : 'Barcha mahsulotlar';

  return (
    <div className="space-y-6">
      <nav className="text-muted-foreground flex items-center gap-2 text-sm">
        <Link href="/" className="hover:text-foreground">
          Bosh sahifa
        </Link>
        <ChevronRight size={14} />
        <Link href="/catalog" className="hover:text-foreground">
          Katalog
        </Link>
        {selectedCategory && (
          <>
            <ChevronRight size={14} />
            <span className="text-foreground">{pickLocale(selectedCategory.name, locale)}</span>
          </>
        )}
        {selectedBrand && (
          <>
            <ChevronRight size={14} />
            <span className="text-foreground">{selectedBrand.name}</span>
          </>
        )}
      </nav>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{list.length} ta mahsulot topildi</p>
        </div>

        <form className="flex items-center gap-2">
          <label htmlFor="sort" className="text-muted-foreground text-sm">
            Saralash:
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={searchParams.sort ?? 'popularity'}
            className="border-input bg-background focus:border-primary h-9 rounded-md border px-3 text-sm outline-none"
          >
            <option value="popularity">Mashhurligi bo&apos;yicha</option>
            <option value="price-asc">Avval arzon</option>
            <option value="price-desc">Avval qimmat</option>
            <option value="rating">Reyting bo&apos;yicha</option>
            <option value="newest">Yangi tushganlar</option>
          </select>
          {Object.entries(searchParams).map(([k, v]) =>
            k !== 'sort' && v ? <input key={k} type="hidden" name={k} value={v} /> : null,
          )}
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
          <div className="bg-card rounded-xl border p-4">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Filter size={16} /> Filtrlar
            </div>

            <div className="space-y-5">
              <FilterGroup title="Kategoriya">
                <ul className="space-y-1.5">
                  {categories.map((c) => {
                    const active = c.slug === searchParams.category;
                    return (
                      <li key={c.id}>
                        <Link
                          href={active ? '/catalog' : `/catalog?category=${c.slug}`}
                          className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition ${
                            active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'
                          }`}
                        >
                          <span>
                            {c.emoji} {pickLocale(c.name, locale)}
                          </span>
                          <span className="text-muted-foreground text-xs">{c.productCount}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </FilterGroup>

              <FilterGroup title="Brend">
                <ul className="space-y-1.5">
                  {brands.slice(0, 6).map((b) => {
                    const active = b.slug === searchParams.brand;
                    return (
                      <li key={b.id}>
                        <Link
                          href={active ? '/catalog' : `/catalog?brand=${b.slug}`}
                          className={`block rounded-md px-2 py-1.5 text-sm transition ${
                            active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-accent'
                          }`}
                        >
                          {b.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </FilterGroup>

              <FilterGroup title="Narx oralig'i">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="0"
                    className="border-input bg-background focus:border-primary h-9 w-full rounded-md border px-2 text-sm outline-none"
                  />
                  <span className="text-muted-foreground">—</span>
                  <input
                    type="number"
                    placeholder="10 000 000"
                    className="border-input bg-background focus:border-primary h-9 w-full rounded-md border px-2 text-sm outline-none"
                  />
                </div>
                <div className="text-muted-foreground mt-2 text-xs">UZS</div>
              </FilterGroup>

              <FilterGroup title="Mavjudligi">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="border-input h-4 w-4 rounded" defaultChecked />
                  Faqat omborda mavjud
                </label>
              </FilterGroup>
            </div>
          </div>
        </aside>

        <div>
          {list.length === 0 ? (
            <div className="bg-card rounded-xl border p-10 text-center">
              <p className="text-muted-foreground">
                Hech narsa topilmadi. Filtrlarni o&apos;zgartirib ko&apos;ring.
              </p>
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
      <div className="text-muted-foreground mb-2 text-xs font-semibold uppercase tracking-wide">
        {title}
      </div>
      {children}
    </div>
  );
}
