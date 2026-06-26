'use client';

import { Clock, Search, TrendingUp, X } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import * as React from 'react';

import { pickLocale, type Locale, type LocalizedText } from '../../lib/mock-data';

const RECENT_KEY = 'sb_recent_searches';
const DEBOUNCE_MS = 220;

interface SuggestProduct {
  id: string;
  slug: string;
  name: LocalizedText;
  price: string;
  brand: string | null;
  imageUrl: string | null;
}
interface SuggestCategory {
  id: string;
  slug: string;
  name: LocalizedText;
}
interface SuggestBrand {
  id: string;
  slug: string;
  name: string;
}

export function AnimatedSearch({ className }: { className?: string }) {
  const router = useRouter();
  const common = useTranslations('common');
  const t = useTranslations('search');
  const locale = useLocale() as Locale;
  const suggestions = React.useMemo(() => (t.raw('examples') as string[]) ?? [], [t]);
  const popular = React.useMemo(() => (t.raw('popularSuggestions') as string[]) ?? [], [t]);

  const [value, setValue] = React.useState('');
  const [idx, setIdx] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [products, setProducts] = React.useState<SuggestProduct[]>([]);
  const [categories, setCategories] = React.useState<SuggestCategory[]>([]);
  const [brands, setBrands] = React.useState<SuggestBrand[]>([]);
  const [recents, setRecents] = React.useState<string[]>([]);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecents(JSON.parse(raw) as string[]);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    if (open || suggestions.length === 0) return undefined;
    const id = setInterval(() => setIdx((i) => (i + 1) % suggestions.length), 2500);
    return () => clearInterval(id);
  }, [open, suggestions.length]);

  // Debounced suggest fetch
  React.useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setProducts([]);
      setCategories([]);
      setBrands([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products/suggest?q=${encodeURIComponent(q)}`);
        const json = (await res.json()) as {
          products: SuggestProduct[];
          categories: SuggestCategory[];
          brands: SuggestBrand[];
        };
        setProducts(json.products ?? []);
        setCategories(json.categories ?? []);
        setBrands(json.brands ?? []);
      } catch {
        // ignore
      }
      setLoading(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value]);

  React.useEffect(() => {
    if (!open) return undefined;
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const saveRecent = (q: string) => {
    const cleaned = q.trim();
    if (!cleaned) return;
    const next = [cleaned, ...recents.filter((r) => r !== cleaned)].slice(0, 6);
    setRecents(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const goCatalog = (q: string) => {
    saveRecent(q);
    setOpen(false);
    router.push(`/${locale}/catalog?q=${encodeURIComponent(q)}`);
  };

  const goProduct = (slug: string) => {
    saveRecent(value);
    setOpen(false);
    router.push(`/${locale}/product/${slug}`);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) goCatalog(value);
  };

  const clearRecents = () => {
    setRecents([]);
    try {
      localStorage.removeItem(RECENT_KEY);
    } catch {
      // ignore
    }
  };

  const showEmptyState = value.trim().length < 2;

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <form onSubmit={onSubmit} role="search">
        <div className="border-input bg-background focus-within:border-primary focus-within:ring-primary/20 relative flex h-11 items-center rounded-full border transition focus-within:ring-2">
          <Search
            size={18}
            className="text-muted-foreground pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
          />
          <input
            type="search"
            name="q"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={
              open ? `${common('search')}...` : `${common('search')} — ${suggestions[idx] ?? ''}`
            }
            className="h-full w-full rounded-full bg-transparent pl-11 pr-32 text-sm outline-none"
            autoComplete="off"
          />
          {value ? (
            <button
              type="button"
              onClick={() => setValue('')}
              className="text-muted-foreground hover:text-foreground absolute right-32 top-1/2 -translate-y-1/2"
              aria-label={t('clearInput')}
            >
              <X size={16} />
            </button>
          ) : null}
          <button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90 absolute right-1 top-1/2 h-9 -translate-y-1/2 rounded-full px-5 text-xs font-semibold transition hover:scale-[1.03]"
          >
            {t('submit')}
          </button>
        </div>
      </form>

      {open ? (
        <div className="border-border bg-card absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border shadow-xl">
          {showEmptyState ? (
            <div className="space-y-4 p-4">
              {recents.length > 0 ? (
                <section>
                  <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} /> {t('recent')}
                    </span>
                    <button
                      type="button"
                      onClick={clearRecents}
                      className="text-muted-foreground hover:text-foreground text-[10px] normal-case tracking-normal"
                    >
                      {common('clear')}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {recents.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setValue(r);
                          goCatalog(r);
                        }}
                        className="bg-muted hover:bg-accent rounded-full px-3 py-1 text-xs"
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}
              <section>
                <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
                  <TrendingUp size={12} /> {t('popular')}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {popular.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => {
                        setValue(p);
                        goCatalog(p);
                      }}
                      className="border-border bg-card hover:bg-accent rounded-full border px-3 py-1 text-xs"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </section>
            </div>
          ) : (
            <div className="p-2">
              {loading && products.length === 0 ? (
                <div className="text-muted-foreground py-6 text-center text-xs">
                  {t('searching')}
                </div>
              ) : products.length === 0 && categories.length === 0 && brands.length === 0 ? (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  {t('noResults')}
                </div>
              ) : (
                <>
                  {categories.length > 0 ? (
                    <section className="border-border border-b pb-2">
                      <div className="text-muted-foreground px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider">
                        {t('categoriesLabel')}
                      </div>
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            router.push(`/${locale}/catalog?category=${c.slug}`);
                          }}
                          className="hover:bg-accent block w-full rounded px-3 py-2 text-left text-sm"
                        >
                          {pickLocale(c.name, locale)}
                        </button>
                      ))}
                    </section>
                  ) : null}

                  {brands.length > 0 ? (
                    <section className="border-border border-b pb-2">
                      <div className="text-muted-foreground px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider">
                        {t('brandsLabel')}
                      </div>
                      {brands.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            setOpen(false);
                            router.push(`/${locale}/catalog?brand=${b.slug}`);
                          }}
                          className="hover:bg-accent block w-full rounded px-3 py-2 text-left text-sm"
                        >
                          {b.name}
                        </button>
                      ))}
                    </section>
                  ) : null}

                  {products.length > 0 ? (
                    <section>
                      <div className="text-muted-foreground px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider">
                        {t('productsLabel')}
                      </div>
                      {products.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => goProduct(p.slug)}
                          className="hover:bg-accent flex w-full items-center gap-3 rounded px-3 py-2 text-left"
                        >
                          <div className="bg-muted relative h-12 w-12 shrink-0 overflow-hidden rounded-md">
                            {p.imageUrl ? (
                              <Image
                                src={p.imageUrl}
                                alt=""
                                fill
                                sizes="48px"
                                className="object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">
                              {pickLocale(p.name, locale)}
                            </div>
                            <div className="text-muted-foreground truncate text-[11px]">
                              {p.brand ?? ''}
                            </div>
                          </div>
                          <div className="text-primary text-sm font-semibold">
                            {Number(p.price).toLocaleString('uz-UZ')} {common('currency')}
                          </div>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => goCatalog(value)}
                        className="bg-muted hover:bg-accent mt-1 w-full rounded px-3 py-2 text-center text-xs font-medium"
                      >
                        {t('allResultsFor', { q: value })}
                      </button>
                    </section>
                  ) : null}
                </>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
