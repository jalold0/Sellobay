import { ChevronRight, Filter } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

import { ProductCardClient } from '../../../components/product/product-card-client';
import {
  brands,
  categories,
  findBySlug,
  pickLocale,
  products,
  type Locale,
} from '../../../lib/mock-data';

interface CatalogPageProps {
  searchParams: { category?: string; brand?: string; sort?: string; q?: string };
}

export default function CatalogPage({ searchParams }: CatalogPageProps) {
  const locale = useLocale() as Locale;

  let list = products.slice();
  const selectedCategory = searchParams.category ? findBySlug(categories, searchParams.category) : undefined;
  const selectedBrand = searchParams.brand ? findBySlug(brands, searchParams.brand) : undefined;

  if (selectedCategory) list = list.filter((p) => p.categoryId === selectedCategory.id);
  if (selectedBrand) list = list.filter((p) => p.brandId === selectedBrand.id);
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase();
    list = list.filter(
      (p) =>
        Object.values(p.name).some((n) => n.toLowerCase().includes(q)) ||
        p.brand.toLowerCase().includes(q),
    );
  }

  switch (searchParams.sort) {
    case 'price-asc':
      list.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      list.sort((a, b) => b.price - a.price);
      break;
    case 'rating':
      list.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      list.sort((a, b) => (a.badge === 'NEW' ? -1 : b.badge === 'NEW' ? 1 : 0));
      break;
    default:
      list.sort((a, b) => b.reviewCount - a.reviewCount);
  }

  const title = selectedCategory
    ? pickLocale(selectedCategory.name, locale)
    : selectedBrand
      ? selectedBrand.name
      : searchParams.q
        ? `"${searchParams.q}" bo'yicha natijalar`
        : 'Barcha mahsulotlar';

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
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
          <p className="mt-1 text-sm text-muted-foreground">{list.length} ta mahsulot topildi</p>
        </div>

        <form className="flex items-center gap-2">
          <label htmlFor="sort" className="text-sm text-muted-foreground">
            Saralash:
          </label>
          <select
            id="sort"
            name="sort"
            defaultValue={searchParams.sort ?? 'popularity'}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
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
          <div className="rounded-xl border bg-card p-4">
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
                            active ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-accent'
                          }`}
                        >
                          <span>
                            {c.emoji} {pickLocale(c.name, locale)}
                          </span>
                          <span className="text-xs text-muted-foreground">{c.productCount}</span>
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
                            active ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-accent'
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
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-primary"
                  />
                  <span className="text-muted-foreground">—</span>
                  <input
                    type="number"
                    placeholder="10 000 000"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="mt-2 text-xs text-muted-foreground">UZS</div>
              </FilterGroup>

              <FilterGroup title="Mavjudligi">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="h-4 w-4 rounded border-input" defaultChecked />
                  Faqat omborda mavjud
                </label>
              </FilterGroup>
            </div>
          </div>
        </aside>

        <div>
          {list.length === 0 ? (
            <div className="rounded-xl border bg-card p-10 text-center">
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
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}
