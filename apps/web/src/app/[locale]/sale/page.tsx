import { Badge, EmptyState } from '@ecom/ui';
import { Flame } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';

import { ProductCardClient } from '../../../components/product/product-card-client';
import { fetchProducts } from '../../../lib/catalog';
import { discountPercent, formatMoney } from '../../../lib/format';

import type { Locale } from '../../../lib/mock-data';
import type { Metadata } from 'next';

// ISR — bosh sahifa bilan bir xil ritm.
export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('sale');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

/**
 * Aksiyalar sahifasi.
 *
 * Ilgari bu sahifa BUTUNLAY `mock-data.ts` dagi demo mahsulotlar ustida
 * turardi: bosh sahifadagi "Chegirmalarni ko'rish" mijozni mavjud bo'lmagan
 * tovarlar ro'yxatiga olib borardi va ularni savatga qo'shsa checkout
 * "Invalid uuid" bilan yiqilardi (mock id'lari UUID emas).
 *
 * Shu bilan birga sahifada ikkita to'qima raqam bor edi: qotib yozilgan
 * "Aksiya tugashiga: 3 kun 14 soat 22 daqiqa" va "Mijozlar yutishi 12 480".
 * Ikkalasi ham olib tashlandi — ortida ma'lumot yo'q.
 */
export default async function SalePage() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('sale');

  const { items } = await fetchProducts({ sort: 'popularity', limit: 48 });
  // Chegirmada turgan mahsulot = eski narxi bor va u joriy narxdan yuqori.
  const saleItems = items.filter((p) => p.oldPrice !== undefined && p.oldPrice > p.price);

  const biggestDiscount = saleItems.reduce(
    (max, p) => Math.max(max, discountPercent(p.price, p.oldPrice)),
    0,
  );
  const totalSaved = saleItems.reduce((sum, p) => sum + ((p.oldPrice ?? p.price) - p.price), 0);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-red-500 to-orange-500 px-6 py-10 text-white md:px-12 md:py-16">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <Badge className="bg-white text-rose-600 hover:bg-white">
            <Flame size={12} className="mr-1" /> {t('badge')}
          </Badge>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            {saleItems.length > 0
              ? t('titleWithDiscount', { percent: biggestDiscount })
              : t('title')}
          </h1>
          <p className="mt-3 text-white/90 md:text-lg">{t('subtitle')}</p>
        </div>
      </section>

      {saleItems.length === 0 ? (
        <EmptyState icon={Flame} title={t('emptyTitle')} description={t('emptyDesc')} />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {[
              {
                label: t('stats.items'),
                value: t('stats.itemsValue', { count: saleItems.length }),
              },
              { label: t('stats.maxDiscount'), value: `${biggestDiscount}%` },
              { label: t('stats.totalSaved'), value: formatMoney(totalSaved) },
            ].map((s) => (
              <div key={s.label} className="bg-card rounded-xl border p-4">
                <div className="text-muted-foreground text-xs">{s.label}</div>
                <div className="mt-1 text-xl font-bold">{s.value}</div>
              </div>
            ))}
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-bold">{t('allSales')}</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {saleItems.map((p) => (
                <ProductCardClient key={p.id} product={p} locale={locale} stockLeft={p.stock} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
