'use client';

import { Button, EmptyState, Skeleton } from '@ecom/ui';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import * as React from 'react';

import { ProductCardClient } from '../../../../components/product/product-card-client';
import { type Locale, type MockProduct } from '../../../../lib/mock-data';
import { useWishlist } from '../../../../store/wishlist';

interface ApiProduct {
  id: string;
  slug: string;
  name: { uz?: string; ru?: string; en?: string } | string;
  price: string;
  oldPrice: string | null;
  currency: string;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  brand: { id: string; slug: string; name: string } | null;
  imageUrl: string | null;
  category: { slug: string; name: { uz?: string; ru?: string; en?: string } | string } | null;
}

const PICSUM_SEED_RE = /picsum\.photos\/seed\/([^/]+)\//;

function toMockProduct(p: ApiProduct): MockProduct {
  const seedMatch = p.imageUrl ? PICSUM_SEED_RE.exec(p.imageUrl) : null;
  return {
    id: p.id,
    slug: p.slug,
    name:
      typeof p.name === 'string'
        ? { uz: p.name, ru: p.name, en: p.name }
        : (p.name as MockProduct['name']),
    brand: p.brand?.name ?? 'Sellobay',
    brandId: p.brand?.slug ?? '',
    categoryId: p.category?.slug ?? '',
    price: Number(p.price),
    oldPrice: p.oldPrice ? Number(p.oldPrice) : undefined,
    currency: 'UZS',
    rating: p.rating,
    reviewCount: p.reviewCount,
    imageSeed: seedMatch?.[1] ?? p.slug,
    badge: p.oldPrice ? 'SALE' : p.isFeatured ? 'TOP' : undefined,
    inStock: true,
  };
}

export default function WishlistPage() {
  const locale = useLocale() as Locale;
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
    fetch(`/api/products?ids=${ids.join(',')}&limit=100`)
      .then((r) => r.json())
      .then((data: { items?: ApiProduct[] }) => {
        const list = (data.items ?? []).map(toMockProduct);
        // Wishlist order'iga moslash
        const order = new Map(ids.map((id, idx) => [id, idx]));
        list.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
        setItems(list);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [mounted, ids]);

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sevimlilar</h1>
          <p className="text-muted-foreground mt-1 text-sm">...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Sevimlilar</h1>
        <p className="text-muted-foreground mt-1 text-sm">{ids.length} ta mahsulot saqlandi</p>
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
