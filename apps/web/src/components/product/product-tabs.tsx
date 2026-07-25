'use client';

// Mahsulot pastki tablari: tavsif, xususiyatlar, sharhlar (rating breakdown bilan)
// va savol-javob.
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Rating,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ecom/ui';
import { Check, HelpCircle, Star, ThumbsUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { formatRelative } from '../../lib/format';
import { type Locale, pickLocale, productImage } from '../../lib/mock-data';
import { type ProductFullDetail } from '../../lib/product-details';

interface Props {
  detail: ProductFullDetail;
  locale: Locale;
}

export function ProductTabs({ detail, locale }: Props) {
  const t = useTranslations('product');
  const { product, description, features, specs, reviews, questions, ratingBreakdown } = detail;

  const ratingBars = ([5, 4, 3, 2, 1] as const).map((star) => ({
    star,
    pct: ratingBreakdown[star] ?? 0,
  }));

  return (
    <section className="border-t pt-8">
      <Tabs defaultValue="description">
        <TabsList>
          <TabsTrigger value="description">{t('tabDescription')}</TabsTrigger>
          <TabsTrigger value="specs">{t('tabSpecs')}</TabsTrigger>
          <TabsTrigger value="reviews" id="reviews">
            {t('tabReviews')} ({product.reviewCount})
          </TabsTrigger>
          <TabsTrigger value="qa">
            {t('tabQa')} ({questions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="description">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-4 text-sm leading-relaxed md:col-span-2">
              <p>{pickLocale(description, locale)}</p>
              <ul className="list-disc space-y-1 pl-5">
                {features.map((f, i) => (
                  <li key={i}>{pickLocale(f, locale)}</li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-xl border p-4 text-sm">
              <div className="mb-3 font-semibold">{t('quickSpecs')}</div>
              <dl className="space-y-2">
                {specs.slice(0, 4).map((s) => (
                  <div key={s.value} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{pickLocale(s.label, locale)}</dt>
                    <dd className="text-right font-medium">{s.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="specs">
          <div className="bg-card rounded-xl border">
            <dl className="divide-y">
              {specs.map((s) => (
                <div key={s.value} className="flex justify-between gap-3 px-4 py-3 text-sm">
                  <dt className="text-muted-foreground">{pickLocale(s.label, locale)}</dt>
                  <dd className="text-right font-medium">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <div className="grid gap-8 md:grid-cols-3">
            <aside className="space-y-4">
              <div className="bg-card rounded-xl border p-5 text-center">
                <div className="text-5xl font-bold">{product.rating.toFixed(1)}</div>
                <div className="mt-2 flex justify-center">
                  <Rating value={product.rating} size={18} />
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  {t('reviewsBasedOn', { count: product.reviewCount })}
                </div>
              </div>
              <div className="space-y-1.5">
                {ratingBars.map((b) => (
                  <div key={b.star} className="flex items-center gap-2 text-xs">
                    <span className="inline-flex w-6 items-center gap-0.5">
                      {b.star} <Star size={10} className="fill-amber-400 text-amber-400" />
                    </span>
                    <div className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                      <div
                        className="h-full rounded-full bg-amber-400"
                        style={{ width: `${b.pct}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground w-8 text-right">{b.pct}%</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full">
                {t('writeReview')}
              </Button>
            </aside>
            <div className="space-y-4 md:col-span-2">
              {reviews.map((r) => (
                <article key={r.id} className="bg-card rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={productImage(r.avatarSeed, 80)} alt={r.author} />
                        <AvatarFallback>{r.author[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{r.author}</div>
                        <div className="text-muted-foreground text-[11px]">
                          {formatRelative(r.createdAt)}
                          {r.verifiedPurchase && (
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
                  <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{r.body}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                    >
                      <ThumbsUp size={12} /> {t('helpful', { count: r.helpfulCount ?? 0 })}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="qa">
          <div className="space-y-4">
            {questions.map((q) => (
              <article key={q.id} className="bg-card rounded-xl border p-4">
                <div className="flex items-start gap-3">
                  <HelpCircle size={18} className="text-primary mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <div>
                      <div className="text-muted-foreground text-xs">
                        {q.author} · {formatRelative(q.createdAt)}
                      </div>
                      <div className="mt-0.5 text-sm font-medium">{q.question}</div>
                    </div>
                    {q.answer && (
                      <div className="bg-muted rounded-md p-3">
                        <div className="text-primary text-xs font-semibold">
                          {q.answeredBy ?? t('answer')}
                        </div>
                        <div className="mt-1 text-sm">{q.answer}</div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
            <Button variant="outline" className="w-full">
              {t('askQuestion')}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
