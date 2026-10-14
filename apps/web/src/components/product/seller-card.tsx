// Tovar sahifasidagi do'kon bloki: kim sotyapti, qanchalik ishonchli,
// va uning boshqa tovarlariga bitta bosish.
import { ChevronRight, Star, Store } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import type { ProductSellerInfo } from '../../lib/catalog';

export function SellerCard({ seller }: { seller: ProductSellerInfo }) {
  const t = useTranslations('product');
  const initial = seller.name.trim()[0]?.toUpperCase() ?? '?';

  return (
    <Link
      href={`/catalog?seller=${seller.id}`}
      className="bg-card hover:border-primary/40 focus-visible:ring-primary group flex items-center gap-3 rounded-xl border p-4 transition-colors focus-visible:outline-none focus-visible:ring-2"
    >
      {seller.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={seller.logoUrl}
          alt=""
          className="bg-muted h-11 w-11 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <span
          aria-hidden
          className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-bold"
        >
          {initial}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <Store size={13} className="text-muted-foreground shrink-0" />
          <span className="truncate text-sm font-semibold">{seller.name}</span>
        </div>
        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 text-xs">
          {seller.rating > 0 ? (
            <span className="text-foreground inline-flex items-center gap-1 font-medium">
              <Star size={12} className="fill-amber-400 text-amber-400" />
              {seller.rating.toFixed(1)}
            </span>
          ) : (
            <span>{t('storeNoRating')}</span>
          )}
          <span>{t('storeProducts', { count: seller.productCount })}</span>
        </div>
      </div>
      <span className="text-primary inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold">
        {t('visitStore')}
        <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}
