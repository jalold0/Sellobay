// Import qilingan global tovarlar ro'yxati + kargo tortgan og'irlikni kiritish.
// O'lchov kiritilganda narx qayta hisoblanadi (zaxira olib tashlanadi → narx odatda pasayadi).

'use client';

import { Button, Card, EmptyState, Input, toast } from '@ecom/ui';
import { ExternalLink, Loader2, PackageSearch, Scale } from 'lucide-react';
import * as React from 'react';

import type { ApiEnvelope, GlobalCatalogRow } from './global-import-types';

const uzs = (n: number) => `${new Intl.NumberFormat('ru-RU').format(Math.round(n))} so'm`;

function localized(name: GlobalCatalogRow['name']): string {
  if (!name) return '—';
  return name.uz ?? name.ru ?? name.en ?? '—';
}

export function GlobalCatalogList({
  items,
  loading,
  onUpdated,
}: {
  items: GlobalCatalogRow[];
  loading: boolean;
  onUpdated: () => void;
}) {
  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-10">
        <Loader2 size={18} className="mr-2 animate-spin" /> Yuklanmoqda...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={PackageSearch}
        title="Hali global tovar yo‘q"
        description="Yuqoridagi forma orqali Xitoy do‘konidan birinchi tovarni import qiling."
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <CatalogRow key={item.id} item={item} onUpdated={onUpdated} />
      ))}
    </div>
  );
}

function CatalogRow({ item, onUpdated }: { item: GlobalCatalogRow; onUpdated: () => void }) {
  const [weight, setWeight] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  async function recordWeight() {
    const kg = Number(weight);
    if (!Number.isFinite(kg) || kg <= 0) {
      toast({ title: "Og'irlikni kiriting", variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/global/catalog/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualWeightKg: kg }),
      });
      const body: ApiEnvelope<{ priceUzs: number; diffUzs: number }> = await res.json();
      if (!res.ok || !body.success || !body.data) {
        toast({ title: body.error?.message ?? 'Bajarilmadi', variant: 'destructive' });
        return;
      }
      const diff = body.data.diffUzs;
      toast({
        title: `Narx qayta hisoblandi: ${uzs(body.data.priceUzs)} (${diff >= 0 ? '+' : ''}${uzs(diff)})`,
        variant: 'success',
      });
      setWeight('');
      onUpdated();
    } catch {
      toast({ title: 'Aloqa uzildi', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{item.sku}</span>
            <span className="bg-muted rounded-full px-2 py-0.5 text-[11px]">{item.platform}</span>
            <span className="bg-muted rounded-full px-2 py-0.5 text-[11px]">
              {item.productStatus}
            </span>
            {item.actualWeightKg !== null && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800">
                o‘lchangan · {item.weightSamples} marta
              </span>
            )}
          </div>
          <div className="mt-1 font-medium">{localized(item.name)}</div>
          <a
            href={item.normalizedUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-muted-foreground mt-0.5 inline-flex items-center gap-1 text-xs hover:underline"
          >
            {item.priceCny} ¥ <ExternalLink size={11} />
          </a>
        </div>

        <div className="text-right">
          <div className="text-lg font-medium">{uzs(item.priceUzs)}</div>
          <div className="text-muted-foreground text-xs">
            {item.actualWeightKg ?? item.estimatedWeightKg} kg · {item.freightMode}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t pt-3">
        <Scale size={14} className="text-muted-foreground shrink-0" />
        <Input
          type="number"
          step="0.01"
          min={0}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Kargo tortgan og‘irlik (kg)"
          className="h-9 max-w-[240px]"
        />
        <Button size="sm" variant="outline" onClick={recordWeight} disabled={busy}>
          {busy && <Loader2 size={14} className="mr-2 animate-spin" />}
          Saqlash va qayta hisoblash
        </Button>
      </div>
    </Card>
  );
}
