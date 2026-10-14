'use client';

// Mahsulot pastki tablari: tavsif, xususiyatlar, sharhlar (rating breakdown bilan)
// va savol-javob.
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@ecom/ui';
import { HelpCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { formatRelative } from '../../lib/format';
import { type Locale, pickLocale } from '../../lib/mock-data';
import { type ProductFullDetail } from '../../lib/product-details';

import { ReviewsPanel } from './reviews-panel';

interface Props {
  detail: ProductFullDetail;
  locale: Locale;
}

export function ProductTabs({ detail, locale }: Props) {
  const t = useTranslations('product');
  // Sharhlar tabi o'z ma'lumotini o'zi so'raydi (filtr va sahifalash bilan).
  const { product, description, features, specs, questions } = detail;

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
              {description ? (
                <p>{pickLocale(description, locale)}</p>
              ) : (
                <p className="text-muted-foreground">{t('noDescription')}</p>
              )}
              {features.length > 0 && (
                <ul className="list-disc space-y-1 pl-5">
                  {features.map((f, i) => (
                    <li key={i}>{pickLocale(f, locale)}</li>
                  ))}
                </ul>
              )}
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
          <ReviewsPanel productId={product.id} slug={product.slug} />
        </TabsContent>

        <TabsContent value="qa">
          {questions.length === 0 ? (
            /* Savol-javob oqimi hali qurilmagan. Ilgari bu yerda sotuvchi
               nomidan o'ylab topilgan javoblar turardi. */
            <div className="text-muted-foreground rounded-xl border border-dashed px-6 py-10 text-center text-sm">
              {t('noQuestions')}
            </div>
          ) : (
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
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
