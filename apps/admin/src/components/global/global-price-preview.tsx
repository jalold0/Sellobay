// Import formasining o'ng ustuni: narx qanday chiqqanini operatorga ochiq ko'rsatadi.
// Maqsad — operator "nega bu narx?" deb so'ramasin va marja qayerda yeyilayotganini ko'rsin.

'use client';

import { Card } from '@ecom/ui';
import { Loader2 } from 'lucide-react';

import type { PricePreview } from './global-import-types';

const uzs = (n: number) => `${new Intl.NumberFormat('ru-RU').format(Math.round(n))} so'm`;

const WEIGHT_SOURCE_LABEL: Record<PricePreview['weightSource'], string> = {
  MEASURED: 'kargo tortgan',
  MANUAL: 'siz kiritdingiz',
  CATEGORY: 'kategoriya standarti',
};

export function PricePreviewPanel({
  preview,
  loading,
}: {
  preview: PricePreview | null;
  loading: boolean;
}) {
  if (!preview) {
    return (
      <Card className="text-muted-foreground p-5 text-sm">
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 size={14} className="animate-spin" /> Hisoblanmoqda...
          </span>
        ) : (
          'Xitoydagi narxni kiriting — yakuniy narx shu yerda chiqadi.'
        )}
      </Card>
    );
  }

  const { costs } = preview;
  const costUsd = costs.goodsUsd + costs.chinaDomesticUsd + costs.freightUsd + costs.agentFeeUsd;
  const freightShare = costUsd > 0 ? (costs.freightUsd / costUsd) * 100 : 0;
  const risky = freightShare > 25;

  return (
    <Card className="h-fit space-y-4 p-5">
      <div>
        <div className="text-muted-foreground text-xs uppercase tracking-wide">Mijoz narxi</div>
        <div className="mt-1 text-3xl font-medium">{uzs(preview.totalUzs)}</div>
        <div className="text-muted-foreground mt-1 text-xs">
          {preview.leadTimeDays[0]}-{preview.leadTimeDays[1]} kun
        </div>
      </div>

      <div className="space-y-1.5 border-t pt-3 text-sm">
        <Row
          label="Og‘irlik"
          value={`${preview.weightKg} kg`}
          hint={WEIGHT_SOURCE_LABEL[preview.weightSource]}
        />
        <Row label="Hisobga olingan" value={`${preview.chargeableKg} kg`} />
        <Row label="Narx kafolati" value={`${preview.guaranteeCeilingKg} kg gacha`} />
      </div>

      <div className="space-y-1.5 border-t pt-3 text-sm">
        <Row label="Tovar" value={`$${costs.goodsUsd.toFixed(2)}`} />
        {costs.chinaDomesticUsd > 0 && (
          <Row label="Xitoy ichki" value={`$${costs.chinaDomesticUsd.toFixed(2)}`} />
        )}
        <Row label="Yuk" value={`$${costs.freightUsd.toFixed(2)}`} />
        <Row label="Agent" value={`$${costs.agentFeeUsd.toFixed(2)}`} />
        {costs.customsUsd > 0 && <Row label="Boj" value={`$${costs.customsUsd.toFixed(2)}`} />}
      </div>

      <div className="space-y-1.5 border-t pt-3 text-sm">
        <Row label="Tannarx" value={uzs(costs.landedUzs)} />
        <Row label="Marja" value={uzs(costs.marginUzs)} strong />
        <Row label="Ekvayring" value={uzs(costs.paymentFeeUzs)} />
      </div>

      <div
        className={[
          'rounded-lg px-3 py-2 text-xs',
          risky ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800',
        ].join(' ')}
      >
        Yuk tannarxning {freightShare.toFixed(0)}% i.{' '}
        {risky
          ? 'Bu tovar Global uchun og‘ir — narxi og‘irligiga nisbatan past.'
          : 'Yaxshi nisbat — bu toifa Global uchun mos.'}
      </div>
    </Card>
  );
}

function Row({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">
        {label}
        {hint ? <span className="ml-1 text-xs">({hint})</span> : null}
      </span>
      <span className={strong ? 'font-medium' : undefined}>{value}</span>
    </div>
  );
}
