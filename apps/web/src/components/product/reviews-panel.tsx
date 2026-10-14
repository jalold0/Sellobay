'use client';

// «Sharhlar» tabi: xulosa (yulduzlar taqsimoti), filtrlar (suratli,
// yulduz bo'yicha), sharhlar suratlari bilan va «Yana ko'rsatish».
//
// Ma'lumot `/api/products/{slug}/reviews` dan — mobil ilova bilan bir
// manba. Taqsimot BUTUN sharhlardan (`summary`), ilgari sahifa faqat
// birinchi 20 tadan hisoblardi.

import { Avatar, AvatarFallback, Dialog, DialogContent, DialogTitle, Rating } from '@ecom/ui';
import { Check, ImageIcon, Star } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { formatRelative } from '../../lib/format';

import { ReviewForm } from './review-form';

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  isVerifiedPurchase: boolean;
  createdAt: string;
  author: string;
}

interface Summary {
  total: number;
  average: number;
  breakdown: Record<'1' | '2' | '3' | '4' | '5', number>;
  withPhotos: number;
}

interface Page {
  items: ReviewItem[];
  hasMore: boolean;
  summary: Summary | null;
}

type Filter = { kind: 'all' } | { kind: 'photos' } | { kind: 'stars'; star: number };

const STARS = [5, 4, 3, 2, 1] as const;

function query(filter: Filter, page: number): string {
  const p = new URLSearchParams({ page: String(page), limit: '10' });
  if (filter.kind === 'photos') p.set('withPhotos', '1');
  if (filter.kind === 'stars') p.set('rating', String(filter.star));
  return p.toString();
}

export function ReviewsPanel({ productId, slug }: { productId: string; slug: string }) {
  const t = useTranslations('product');
  const tr = useTranslations('reviews');
  const [summary, setSummary] = React.useState<Summary | null>(null);
  const [items, setItems] = React.useState<ReviewItem[]>([]);
  const [filter, setFilter] = React.useState<Filter>({ kind: 'all' });
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [failed, setFailed] = React.useState(false);
  const [photo, setPhoto] = React.useState<string | null>(null);
  const [reloadKey, setReloadKey] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    fetch(`/api/products/${slug}/reviews?${query(filter, page)}`, { credentials: 'same-origin' })
      .then((r) => r.json() as Promise<{ success: boolean; data?: Page }>)
      .then((json) => {
        if (!active) return;
        if (!json.success || !json.data) throw new Error('reviews');
        const data = json.data;
        // Xulosa faqat 1-sahifada keladi va filtrga bog'liq emas.
        if (data.summary) setSummary(data.summary);
        setItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
        setHasMore(data.hasMore);
      })
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug, filter, page, reloadKey]);

  const choose = (f: Filter) => {
    setFilter(f);
    setPage(1);
  };

  const same = (f: Filter) =>
    f.kind === filter.kind &&
    (f.kind !== 'stars' || (filter.kind === 'stars' && f.star === filter.star));

  const total = summary?.total ?? 0;

  // Hali birorta sharh yo'q — xulosa va filtrlar ma'nosiz.
  if (summary && total === 0) {
    return (
      <div className="text-muted-foreground space-y-4 rounded-xl border border-dashed px-6 py-10 text-center text-sm">
        <p>{t('noReviews')}</p>
        <div className="flex justify-center">
          <ReviewForm
            productId={productId}
            slug={slug}
            onSubmitted={() => setReloadKey((k) => k + 1)}
          />
        </div>
      </div>
    );
  }

  const chips: { f: Filter; label: string; count?: number; disabled?: boolean }[] = [
    { f: { kind: 'all' }, label: tr('filterAll'), count: total },
    {
      f: { kind: 'photos' },
      label: tr('filterPhotos', { count: summary?.withPhotos ?? 0 }),
      disabled: (summary?.withPhotos ?? 0) === 0,
    },
    ...STARS.map((star) => ({
      f: { kind: 'stars', star } as Filter,
      label: tr('filterStars', { star }),
      count: summary?.breakdown[String(star) as '5'] ?? 0,
      disabled: (summary?.breakdown[String(star) as '5'] ?? 0) === 0,
    })),
  ];

  return (
    <div className="grid gap-8 md:grid-cols-3">
      <aside className="space-y-4">
        <div className="bg-card rounded-xl border p-5 text-center">
          <div className="text-5xl font-bold tabular-nums">
            {(summary?.average ?? 0).toFixed(1)}
          </div>
          <div className="mt-2 flex justify-center">
            <Rating value={summary?.average ?? 0} size={18} />
          </div>
          <div className="text-muted-foreground mt-1 text-xs">
            {t('reviewsBasedOn', { count: total })}
          </div>
        </div>
        <div className="space-y-1.5">
          {STARS.map((star) => {
            const n = summary?.breakdown[String(star) as '5'] ?? 0;
            const pct = total > 0 ? Math.round((n / total) * 100) : 0;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="inline-flex w-6 items-center gap-0.5">
                  {star} <Star size={10} className="fill-amber-400 text-amber-400" />
                </span>
                <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-muted-foreground w-8 text-right tabular-nums">{n}</span>
              </div>
            );
          })}
        </div>
      </aside>

      <div className="min-w-0 space-y-4 md:col-span-2">
        <ReviewForm
          productId={productId}
          slug={slug}
          onSubmitted={() => setReloadKey((k) => k + 1)}
        />

        <div
          className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
          role="toolbar"
          aria-label={t('tabReviews')}
        >
          <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
            {chips.map(({ f, label, count, disabled }) => (
              <button
                key={label}
                type="button"
                disabled={disabled}
                aria-pressed={same(f)}
                onClick={() => choose(f)}
                className={
                  same(f)
                    ? 'bg-primary border-primary whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold text-white'
                    : 'border-border hover:border-primary/40 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40'
                }
              >
                {f.kind === 'photos' && <ImageIcon size={12} className="mr-1 inline" />}
                {label}
                {f.kind !== 'photos' && count !== undefined && (
                  <span className={same(f) ? 'ml-1 text-white/75' : 'text-muted-foreground ml-1'}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {failed && items.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            {tr('noMatch')}
          </p>
        ) : !loading && items.length === 0 ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-6 text-center text-sm">
            {tr('noMatch')}
          </p>
        ) : (
          items.map((r) => (
            <article key={r.id} className="bg-card rounded-xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{(r.author || '?')[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{r.author || tr('verified')}</div>
                    <div className="text-muted-foreground text-[11px]">
                      {formatRelative(r.createdAt)}
                      {r.isVerifiedPurchase && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-emerald-700">
                          <Check size={10} /> {t('verifiedPurchase')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Rating value={r.rating} size={14} />
              </div>
              {r.title && <div className="mt-3 text-sm font-medium">{r.title}</div>}
              {r.body && (
                <p className="text-muted-foreground mt-2 whitespace-pre-line text-sm leading-relaxed">
                  {r.body}
                </p>
              )}
              {r.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.images.map((src, i) => (
                    <button
                      key={src}
                      type="button"
                      onClick={() => setPhoto(src)}
                      className="focus-visible:ring-primary overflow-hidden rounded-lg border focus-visible:outline-none focus-visible:ring-2"
                      aria-label={`${tr('photo')} ${i + 1}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" loading="lazy" className="h-20 w-20 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))
        )}

        {hasMore && (
          <button
            type="button"
            disabled={loading}
            onClick={() => setPage((p) => p + 1)}
            className="border-border hover:border-primary/40 w-full rounded-full border py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {tr('showMore')}
          </button>
        )}
      </div>

      <Dialog open={photo !== null} onOpenChange={(open) => !open && setPhoto(null)}>
        <DialogContent className="max-w-2xl p-2">
          <DialogTitle className="sr-only">{tr('photo')}</DialogTitle>
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={tr('photo')}
              className="max-h-[80vh] w-full rounded-md object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
