import { RETURN_WINDOW_DAYS } from '@ecom/core-domain';
import { Card } from '@ecom/ui';
import { CalendarClock, Check, CircleDot, MessageCircle, Package, Undo2, X } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

import { PageHero } from '../../../components/static/page-hero';

import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('returnsPage');
  return { title: t('metaTitle') };
}

export default async function ReturnsPage() {
  const t = await getTranslations('returnsPage');

  const steps = [
    { icon: MessageCircle, title: t('step1Title'), desc: t('step1Desc') },
    { icon: Package, title: t('step2Title'), desc: t('step2Desc') },
    { icon: Check, title: t('step3Title'), desc: t('step3Desc') },
  ];
  const canReturn = [t('can1'), t('can2'), t('can3'), t('can4')];
  const cantReturn = [t('cant1'), t('cant2'), t('cant3'), t('cant4')];

  return (
    <div className="space-y-10">
      <PageHero
        icon={Undo2}
        title={t('heroTitle')}
        description={t('heroDesc', { days: RETURN_WINDOW_DAYS })}
        accent="emerald"
      />

      <section>
        <h2 className="mb-4 text-2xl font-bold">{t('howTitle')}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card key={s.title} className="p-5">
                <div className="flex items-center gap-3">
                  <div className="bg-primary text-primary-foreground grid h-10 w-10 place-items-center rounded-full font-bold">
                    {i + 1}
                  </div>
                  <Icon size={20} className="text-muted-foreground" />
                </div>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm">{s.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/*
        Qaytarish muddati. Ilgari bu sahifada muddat UMUMAN aytilmasdi —
        faqat "yetkazilganda tekshiring" deyilardi. Holbuki tizim mijozga
        yetkazilgandan keyin ham {RETURN_WINDOW_DAYS} kun beradi
        (/api/orders/[id]/return). Ya'ni foydalanuvchi o'zida bor huquqni
        bilmasdi. Son @ecom/core-domain dan — kod bilan bir manba.
      */}
      <section>
        <Card className="flex items-start gap-4 p-5">
          <div className="bg-primary/10 text-primary grid h-10 w-10 shrink-0 place-items-center rounded-lg">
            <CalendarClock size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold">{t('windowTitle')}</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {t('windowDesc', { days: RETURN_WINDOW_DAYS })}
            </p>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-emerald-700">
            <Check size={18} />
            <h3 className="text-base font-semibold">{t('canTitle')}</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {canReturn.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <CircleDot size={12} className="mt-1 shrink-0 text-emerald-600" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2 text-red-700">
            <X size={18} />
            <h3 className="text-base font-semibold">{t('cantTitle')}</h3>
          </div>
          <ul className="space-y-2 text-sm">
            {cantReturn.map((r) => (
              <li key={r} className="flex items-start gap-2">
                <CircleDot size={12} className="mt-1 shrink-0 text-red-600" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
