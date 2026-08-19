// Mijozning buyurtma sahifasidagi Global kuzatuv bloki.
// Faqat ko'rinish: ma'lumot `/api/orders`dan tayyor holda keladi (global-order-view.ts).

'use client';

import { Check, Plane, Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type GlobalStage =
  | 'CHECKING'
  | 'PRICE_CHANGED'
  | 'CONFIRMED'
  | 'PURCHASED'
  | 'IN_CARGO'
  | 'DELIVERED'
  | 'CANCELLED';

export interface CustomerGlobalView {
  stage: GlobalStage;
  stageIndex: number;
  freightMode: 'AUTO' | 'AVIA';
  leadTimeDays: [number, number];
  trackNumber: string | null;
  needsDecision: boolean;
  extraChargeUzs: number | null;
  purchasedAt: string | null;
  cargoRegisteredAt: string | null;
  deliveredAt: string | null;
}

const TIMELINE: GlobalStage[] = ['CHECKING', 'CONFIRMED', 'PURCHASED', 'IN_CARGO', 'DELIVERED'];

const uzs = (n: number) => `${new Intl.NumberFormat('ru-RU').format(Math.round(n))} so'm`;

export function GlobalOrderTracker({ view }: { view: CustomerGlobalView }) {
  const t = useTranslations('global.tracker');
  const Icon = view.freightMode === 'AVIA' ? Plane : Truck;

  if (view.stage === 'CANCELLED') {
    return (
      <div className="bg-crimson-chip text-brand-crimson rounded-xl px-4 py-3 text-sm">
        {t('cancelled')}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Icon size={15} className="text-brand-crimson" />
          {t(view.freightMode === 'AVIA' ? 'avia' : 'auto')}
        </span>
        <span className="text-muted-foreground text-sm">
          {t('leadTime', { min: view.leadTimeDays[0], max: view.leadTimeDays[1] })}
        </span>
      </div>

      {view.needsDecision ? (
        <div className="bg-brand-gold/15 text-brand-gold-text rounded-lg px-3 py-2.5 text-sm">
          {view.extraChargeUzs
            ? t('priceChangedWithAmount', { amount: uzs(view.extraChargeUzs) })
            : t('priceChanged')}
        </div>
      ) : (
        <ol className="space-y-2">
          {TIMELINE.map((stage, i) => {
            const done = view.stageIndex > i;
            const current = view.stageIndex === i;
            return (
              <li key={stage} className="flex items-start gap-2.5">
                <span
                  className={[
                    'mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                    done || current
                      ? 'bg-brand-crimson text-white'
                      : 'bg-chip text-muted-foreground',
                  ].join(' ')}
                >
                  {done ? <Check size={11} /> : i + 1}
                </span>
                <div className="min-w-0">
                  <div
                    className={[
                      'text-sm',
                      current ? 'text-brand-ink font-semibold' : 'text-muted-foreground',
                    ].join(' ')}
                  >
                    {t(`stage.${stage}`)}
                  </div>
                  {current && (
                    <div className="text-muted-foreground text-xs">{t(`hint.${stage}`)}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {view.trackNumber && (
        <div className="bg-success-chip rounded-lg px-3 py-2 text-sm text-emerald-800">
          {t('track')}: <span className="font-mono">{view.trackNumber}</span>
        </div>
      )}
    </div>
  );
}
