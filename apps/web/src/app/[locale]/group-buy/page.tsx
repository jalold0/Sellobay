import { Badge } from '@ecom/ui';
import { Gift, Share2, Users } from 'lucide-react';
import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { GroupBuyCard } from '../../../components/group-buy/group-buy-card';
import { getGroupDeals } from '../../../lib/group-buy';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('groupBuy');
  return { title: t('metaTitle'), description: t('metaDescription') };
}

export default function GroupBuyPage() {
  const t = useTranslations('groupBuy');
  const deals = getGroupDeals();

  const steps = [
    { icon: Users, title: t('step1Title'), desc: t('step1Desc') },
    { icon: Share2, title: t('step2Title'), desc: t('step2Desc') },
    { icon: Gift, title: t('step3Title'), desc: t('step3Desc') },
  ];

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-red-500 to-orange-500 px-6 py-10 text-white md:px-12 md:py-16">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="relative max-w-2xl">
          <Badge className="bg-white text-rose-600 hover:bg-white">
            <Users size={12} className="mr-1" /> {t('badge')}
          </Badge>
          <h1 className="mt-4 text-3xl font-bold leading-tight md:text-5xl">{t('title')}</h1>
          <p className="mt-3 max-w-xl text-white/90 md:text-lg">{t('subtitle')}</p>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="mb-4 text-2xl font-bold">{t('howTitle')}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="rounded-2xl border p-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-rose-600 font-bold text-white">
                    {i + 1}
                  </div>
                  <Icon size={20} className="text-rose-600" />
                </div>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Active groups */}
      <section>
        <h2 className="mb-4 text-2xl font-bold">{t('activeTitle')}</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {deals.map((deal) => (
            <GroupBuyCard key={deal.id} deal={deal} />
          ))}
        </div>
      </section>
    </div>
  );
}
