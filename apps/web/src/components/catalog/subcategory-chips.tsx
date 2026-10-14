import Link from 'next/link';

interface Item {
  slug: string;
  label: string;
  count: number;
}

interface Props {
  /** Bo'limning o'zi — «Barchasi» chipi uni tanlaydi. */
  department: { slug: string; label: string };
  items: Item[];
  activeSlug: string;
  /** Boshqa filtrlar tur almashganda saqlanadi. */
  keep: { brand?: string; sort?: string; q?: string };
  ariaLabel: string;
}

function href(slug: string, keep: Props['keep']): string {
  const params = new URLSearchParams({ category: slug });
  for (const [k, v] of Object.entries(keep)) if (v) params.set(k, v);
  return `/catalog?${params.toString()}`;
}

/**
 * Bo'lim ichidagi turlar (Ayollar › Kiyim, Poyabzal...).
 *
 * Server komponent, oddiy havolalar: holat URL'da, JS'siz ishlaydi.
 * Telefonda gorizontal suriladi — qator sahifani kengaytirmaydi.
 */
export function SubcategoryChips({ department, items, activeSlug, keep, ariaLabel }: Props) {
  const chips = [
    { slug: department.slug, label: department.label, count: null as number | null },
    ...items.map((i) => ({ ...i, count: i.count as number | null })),
  ];
  return (
    <nav aria-label={ariaLabel} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
        {chips.map((c) => {
          const active = c.slug === activeSlug;
          return (
            <li key={c.slug}>
              <Link
                href={href(c.slug, keep)}
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? 'bg-primary border-primary inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-[13.5px] font-semibold text-white'
                    : 'border-border text-brand-ink hover:border-primary/40 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border bg-white px-4 py-2 text-[13.5px] font-medium transition-colors'
                }
              >
                {c.label}
                {c.count !== null && (
                  <span className={active ? 'text-white/75' : 'text-muted-foreground'}>
                    {c.count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
