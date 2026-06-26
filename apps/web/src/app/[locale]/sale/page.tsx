import { Badge } from '@ecom/ui';
import { Clock, Flame } from 'lucide-react';
import type { Metadata } from 'next';
import { useLocale, useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { ProductCardClient } from '../../../components/product/product-card-client';
import { discountPercent, formatMoney } from '../../../lib/format';
import { type Locale, products } from '../../../lib/mock-data';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('sale');
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default function SalePage() {
  const locale = useLocale() as Locale;
  const t = useTranslations('sale');
  const saleItems = products.filter((p) => p.oldPrice || p.badge === 'SALE' || p.badge === 'TOP');
  const biggestDiscount = Math.max(
    0,
    ...saleItems.map((p) => discountPercent(p.price, p.oldPrice)),
  );
  const totalSaved = saleItems.reduce((s, p) => s + (p.oldPrice ? p.oldPrice - p.price : 0), 0);

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-red-500 to-orange-500 px-6 py-10 text-white md:px-12 md:py-16">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <Badge className="bg-white text-rose-600 hover:bg-white">
            <Flame size={12} className="mr-1" /> {t('badge')}
          </Badge>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            {t('titleWithDiscount', { percent: biggestDiscount })}
          </h1>
          <p className="mt-3 text-white/90 md:text-lg">{t('subtitle')}</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 backdrop-blur">
            <Clock size={16} />
            <span className="text-sm font-medium">{t('countdown')}</span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: t('stats.items'), value: t('stats.itemsValue', { count: saleItems.length }) },
          { label: t('stats.maxDiscount'), value: `${biggestDiscount}%` },
          { label: t('stats.totalSaved'), value: formatMoney(totalSaved) },
          { label: t('stats.winners'), value: '12 480' },
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
            <ProductCardClient key={p.id} product={p} locale={locale} />
          ))}
        </div>
      </section>
    </div>
  );
}
