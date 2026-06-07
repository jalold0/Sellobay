'use client';

import { Button, EmptyState } from '@ecom/ui';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import * as React from 'react';

import { ProductCardClient } from '../../../../components/product/product-card-client';
import { type Locale, products } from '../../../../lib/mock-data';
import { useWishlist } from '../../../../store/wishlist';

export default function WishlistPage() {
  const locale = useLocale() as Locale;
  const ids = useWishlist((s) => s.ids);
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const items = mounted ? products.filter((p) => ids.includes(p.id)) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sevimlilar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mounted ? `${items.length} ta mahsulot saqlandi` : '...'}
        </p>
      </div>

      {mounted && items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="Sevimlilar bo`sh"
          description="Yoqtirgan mahsulotlaringizni saqlab qo`yish uchun kartochkadagi yurakcha tugmasini bosing"
          action={
            <Button asChild>
              <Link href="/catalog">Katalogni ochish</Link>
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
