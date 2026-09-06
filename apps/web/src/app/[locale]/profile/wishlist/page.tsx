'use client';

import { Button, EmptyState, Skeleton } from '@ecom/ui';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import * as React from 'react';

import { ProductCardClient } from '../../../../components/product/product-card-client';
import { fetchProductsByIds } from '../../../../lib/api-products';
import { type Locale, type MockProduct } from '../../../../lib/mock-data';
import { useWishlist } from '../../../../store/wishlist';

export default function WishlistPage() {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const ids = useWishlist((s) => s.ids);
  const [mounted, setMounted] = React.useState(false);
  const [items, setItems] = React.useState<MockProduct[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  React.useEffect(() => {
    if (!mounted) return;
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    setLoading(true);
    let cancelled = false;
    fetchProductsByIds(ids)
      .then((list) => {
        if (cancelled) return;
        // Sevimlilarga qo'shilgan tartibga moslash
        const order = new Map(ids.map((id, idx) => [id, idx]));
        setItems([...list].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, ids]);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('wishlist.title')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('wishlist.title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t('wishlist.savedCount', { count: ids.length })}
        </p>
      </div>

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: Math.min(ids.length, 8) }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : ids.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={t('wishlist.emptyTitle')}
          description={t('wishlist.emptyDesc')}
          action={
            <Button asChild>
              <Link href="/catalog">{t('cart.openCatalog')}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {items.map((p) => (
            <ProductCardClient key={p.id} product={p} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
