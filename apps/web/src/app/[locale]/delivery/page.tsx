import { EXPRESS_FEE, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@ecom/core-domain';
import { Card } from '@ecom/ui';
import { Bike, Building, Clock, Map, Package, Truck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { PageHero } from '../../../components/static/page-hero';
import { formatMoney } from '../../../lib/format';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('deliveryPage');
  return { title: t('metaTitle') };
}

export default async function DeliveryPage() {
  const t = await getTranslations('deliveryPage');

  // Narxlar @ecom/core-domain KONSTANTALARIDAN. Ilgari ular sahifada matn
  // sifatida yozilgan edi ("20 000 so'm", "500 000 so'mdan boshlab tekin") —
  // qiymat o'zgarsa sahifa jim eskirib qolardi va mijozga checkout'dagidan
  // boshqa narx va'da qilinardi.
  const methods = [
    {
      icon: Truck,
      title: t('homeTitle'),
      desc: t('homeDesc'),
      price: formatMoney(SHIPPING_FEE),
      free: t('homeFree', { amount: formatMoney(FREE_SHIPPING_THRESHOLD) }),
    },
    {
      icon: Bike,
      title: t('expressTitle'),
      desc: t('expressDesc'),
      price: formatMoney(EXPRESS_FEE),
      free: t('expressFree'),
    },
    {
      icon: Building,
      title: t('pickupTitle'),
      desc: t('pickupDesc'),
      price: t('pickupPrice'),
      free: t('pickupFree'),
    },
  ];

  // next-intl massivni `t.raw` orqali beradi.
  const regions = (t.raw('regionList') as string[]) ?? [];

  return (
    <div className="space-y-10">
      <PageHero icon={Truck} title={t('heroTitle')} description={t('heroDesc')} accent="sky" />

      <section className="grid gap-4 md:grid-cols-3">
        {methods.map((m) => {
          const Icon = m.icon;
          return (
            <Card key={m.title} className="p-5">
              <div className="bg-primary/10 text-primary grid h-12 w-12 place-items-center rounded-lg">
                <Icon size={22} />
              </div>
              <h3 className="mt-3 text-base font-semibold">{m.title}</h3>
              <p className="text-muted-foreground text-xs">{m.desc}</p>
              <div className="mt-3 border-t pt-3 text-sm">
                <div className="font-medium">{m.price}</div>
                <div className="text-muted-foreground text-xs">{m.free}</div>
              </div>
            </Card>
          );
        })}
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">{t('timesTitle')}</h2>
        <Card className="p-0">
          <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="p-5">
              <div className="flex items-center gap-2 font-semibold">
                <Clock size={16} className="text-primary" /> {t('tashkent')}
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                <li>• {t('tashkent1')}</li>
                <li>• {t('tashkent2')}</li>
                <li>• {t('tashkent3')}</li>
              </ul>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 font-semibold">
                <Map size={16} className="text-primary" /> {t('regions')}
              </div>
              <ul className="mt-3 space-y-1 text-sm">
                <li>• {t('regions1')}</li>
                <li>• {t('regions2')}</li>
                <li>• {t('regions3')}</li>
              </ul>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-bold">{t('zonesTitle')}</h2>
        <div className="flex flex-wrap gap-2">
          {regions.map((r) => (
            <span
              key={r}
              className="bg-card inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm"
            >
              <Package size={12} className="text-primary" />
              {r}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
