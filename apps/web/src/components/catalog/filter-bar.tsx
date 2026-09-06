'use client';

import { Check, ChevronDown, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

interface Props {
  categories: FilterOption[];
  brands: FilterOption[];
  sorts: FilterOption[];
  active: { category?: string; brand?: string; q?: string; sort?: string };
  labels: { category: string; brand: string; sort: string; clear: string; all: string };
}

/**
 * Katalog filtrlari — sarlavha ostidagi bitta gorizontal qator.
 *
 * Ilgari bu yerda 264px lik chap ustun turardi: bosh harfli bo'lim
 * sarlavhalari, kvadrat checkbox'lar va o'ngga tekislangan sonlar ustuni.
 * Bu do'kon emas, korporativ ma'lumot jadvali ko'rinishini berardi va
 * katalogda 2-11 ta mahsulot bo'lganda filtr apparati kontentdan og'irroq
 * chiqardi.
 *
 * Endi mahsulotlar butun kenglikni oladi. Katalog kattalashib, filtrlash
 * haqiqiy ehtiyojga aylansa — yon ustunni qaytarish mumkin, lekin u paytda
 * uning yonida o'nlab mahsulot turadi va u bo'sh ko'rinmaydi.
 *
 * Holat URL'da qoladi (?category=&brand=&sort=), ya'ni filtrlash serverda
 * bajariladi va havolani ulashish mumkin.
 */
export function FilterBar({ categories, brands, sorts, active, labels }: Props) {
  const [open, setOpen] = React.useState<string | null>(null);
  const pathname = usePathname();
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setOpen(null), [pathname, active.category, active.brand, active.sort]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const href = (patch: Partial<Props['active']>) => {
    const params = new URLSearchParams();
    const next = { ...active, ...patch };
    (['category', 'brand', 'q', 'sort'] as const).forEach((k) => {
      if (next[k]) params.set(k, next[k] as string);
    });
    const qs = params.toString();
    return `/catalog${qs ? `?${qs}` : ''}`;
  };

  const activeCategory = categories.find((c) => c.value === active.category);
  const activeBrand = brands.find((b) => b.value === active.brand);
  const activeSort = sorts.find((s) => s.value === active.sort) ?? sorts[0];
  const hasFilters = Boolean(active.category || active.brand || active.q);

  const dropdown = (
    id: string,
    label: string,
    options: FilterOption[],
    selected: FilterOption | undefined,
    key: 'category' | 'brand' | 'sort',
  ) => (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => (v === id ? null : id))}
        aria-expanded={open === id}
        aria-haspopup="listbox"
        className={
          'flex items-center gap-1.5 rounded-full border px-4 py-[9px] text-[13px] font-semibold transition ' +
          (selected && key !== 'sort'
            ? 'border-primary text-primary bg-primary/5'
            : 'border-border text-brand-ink hover:border-brand-ink bg-white')
        }
      >
        {selected?.label ?? label}
        <ChevronDown size={14} className={open === id ? 'rotate-180 transition' : 'transition'} />
      </button>

      {open === id && (
        <div
          role="listbox"
          className="border-border absolute left-0 top-full z-30 mt-2 max-h-[320px] w-[240px] overflow-y-auto rounded-2xl border bg-white p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.12)]"
        >
          {key !== 'sort' && (
            <Link
              href={href({ [key]: undefined } as Partial<Props['active']>)}
              className="hover:bg-soft text-brand-ink flex items-center justify-between rounded-xl px-3 py-2 text-[13.5px] transition"
            >
              {labels.all}
              {!selected && <Check size={14} className="text-primary" />}
            </Link>
          )}
          {options.map((o) => {
            const isOn = selected?.value === o.value;
            return (
              <Link
                key={o.value}
                href={href({ [key]: o.value } as Partial<Props['active']>)}
                className={
                  'flex items-center justify-between rounded-xl px-3 py-2 text-[13.5px] transition ' +
                  (isOn ? 'text-primary font-semibold' : 'text-brand-ink hover:bg-soft')
                }
              >
                {o.label}
                {isOn && <Check size={14} className="text-primary" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div ref={ref} className="flex flex-wrap items-center gap-2">
      {dropdown('category', labels.category, categories, activeCategory, 'category')}
      {dropdown('brand', labels.brand, brands, activeBrand, 'brand')}

      {active.q && (
        <Link
          href={href({ q: undefined })}
          className="bg-soft border-border text-brand-ink hover:border-primary inline-flex items-center gap-2 rounded-full border px-4 py-[9px] text-[13px] font-semibold transition"
        >
          &quot;{active.q}&quot;
          <X size={13} className="text-primary" />
        </Link>
      )}

      {hasFilters && (
        <Link
          href="/catalog"
          className="text-primary ml-1 text-[13px] font-semibold hover:underline"
        >
          {labels.clear}
        </Link>
      )}

      <div className="ml-auto">{dropdown('sort', labels.sort, sorts, activeSort, 'sort')}</div>
    </div>
  );
}
