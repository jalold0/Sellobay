'use client';

// Mening sharhlarim.
//
// Ilgari bu sahifada QOTIB YOZILGAN ikkita sharh turardi ("Nike Air
// Max 270", "Chanel N°5") — hamma foydalanuvchi bir xil, o'zi
// yozmagan sharhlarni ko'rardi. Endi `/api/reviews/mine` dan keladi.

import { Button, Card, EmptyState, Rating, Skeleton, toast } from '@ecom/ui';
import { Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { formatRelative } from '../../../../lib/format';
import { pickLocale, type Locale, type LocalizedText } from '../../../../lib/mock-data';

interface MyReview {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  createdAt: string;
  product: { slug: string; name: LocalizedText };
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

export default function MyReviewsPage({ params }: { params: { locale: Locale } }) {
  const t = useTranslations('reviews');
  const tNav = useTranslations('profile.nav');
  const [items, setItems] = React.useState<MyReview[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reviews/mine', { credentials: 'same-origin' });
      const json = (await res.json()) as ApiResult<{ items: MyReview[] }>;
      setItems(json.success && json.data ? json.data.items : []);
    } catch {
      // Tarmoq yo'q — bo'sh ro'yxat. To'qima sharh ko'rsatmaymiz.
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;
    const res = await fetch(`/api/reviews/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    const json = (await res.json()) as ApiResult<{ deleted: true }>;
    if (json.success) {
      toast({ title: t('deleted'), variant: 'success' });
      setItems((p) => p.filter((x) => x.id !== id));
    } else {
      toast({ title: json.error?.message ?? 'Xato', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{tNav('reviews')}</h1>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="p-5">
          <EmptyState icon={Star} title={t('emptyTitle')} description={t('emptyDesc')} />
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <Link
                  href={`/${params.locale}/product/${r.product.slug}`}
                  className="font-medium hover:underline"
                >
                  {pickLocale(r.product.name, params.locale)}
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <Rating value={r.rating} size={14} />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(r.id)}
                    className="text-red-600 hover:text-red-700"
                    aria-label={t('deleteConfirm')}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              {r.title ? <div className="mt-2 text-sm font-semibold">{r.title}</div> : null}
              {r.body ? <p className="text-muted-foreground mt-1 text-sm">{r.body}</p> : null}
              <div className="text-muted-foreground mt-2 text-xs">
                {formatRelative(r.createdAt)}
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
