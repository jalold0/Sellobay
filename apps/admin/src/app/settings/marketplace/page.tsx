'use client';

// /settings/marketplace — sotuvchi tariflari (ADR 0015): FBS va FBO uchun komissiya, har dona
// xizmat haqi, omborga topshirish muddati va sotuvchiga to'lov kunlari. Pastda — jonli misol:
// shu tariflarda 100 000 so'mlik tovardan sotuvchiga qancha qoladi.

import { settleItem, type MarketplaceSettings } from '@ecom/core-domain';
import { Button, Card, Input, Label, PageHeader, toast } from '@ecom/ui';
import { Loader2, RotateCcw } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../../components/layout/breadcrumbs';
import { formatMoney } from '../../../lib/format';

import type { ApiEnvelope } from '../../../components/global/global-import-types';

type Model = 'FBS' | 'FBO';
type PerModelKey = 'commissionPct' | 'feePerUnit' | 'handoverHours';

interface Payload {
  effective: MarketplaceSettings;
  defaults: MarketplaceSettings;
  updatedAt: string | null;
}

const ROWS: Array<{ key: PerModelKey; label: string; hint: string; step: string }> = [
  { key: 'commissionPct', label: 'Komissiya, %', hint: 'Sotuv summasidan', step: '0.1' },
  {
    key: 'feePerUnit',
    label: 'Xizmat haqi, so‘m / dona',
    hint: 'FBO: saqlash, yig‘ish, qadoqlash',
    step: '100',
  },
  {
    key: 'handoverHours',
    label: 'Topshirish muddati, soat',
    hint: 'To‘lovdan keyin omborga yetib kelishi kerak',
    step: '1',
  },
];

const MODELS: Array<{ id: Model; title: string; note: string }> = [
  { id: 'FBS', title: 'FBS', note: 'Sotuvchi qadoqlab olib keladi' },
  { id: 'FBO', title: 'FBO', note: 'Tovar bizning omborda' },
];

const EXAMPLE_PRICE = '100000';

export default function MarketplaceSettingsPage() {
  const [data, setData] = React.useState<Payload | null>(null);
  const [draft, setDraft] = React.useState<MarketplaceSettings | null>(null);
  const [days, setDays] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  const apply = React.useCallback((p: Payload) => {
    setData(p);
    setDraft(structuredClone(p.effective));
    setDays(p.effective.payoutDays.join(', '));
  }, []);

  React.useEffect(() => {
    void (async () => {
      const res = await fetch('/api/marketplace/settings');
      const body: ApiEnvelope<Payload> = await res.json();
      if (body.success && body.data) apply(body.data);
      else toast({ title: body.error?.message ?? 'Sozlamalar yuklanmadi', variant: 'destructive' });
    })();
  }, [apply]);

  function setValue(key: PerModelKey, model: Model, raw: string) {
    if (!draft) return;
    const n = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(n)) return;
    setDraft({ ...draft, [key]: { ...draft[key], [model]: n } });
  }

  const parsedDays = days
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);

  async function save(body: MarketplaceSettings) {
    setSaving(true);
    try {
      const res = await fetch('/api/marketplace/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json: ApiEnvelope<Payload> = await res.json();
      if (!res.ok || !json.success || !json.data) {
        toast({ title: json.error?.message ?? 'Saqlanmadi', variant: 'destructive' });
        return;
      }
      apply(json.data);
      toast({
        title: 'Tariflar saqlandi',
        description: 'Yangi jo‘natma va yetkazilgan buyurtmalarga shu tariflar qo‘llanadi',
        variant: 'success',
      });
    } catch {
      toast({ title: 'Aloqa uzildi — qayta urinib ko‘ring', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  if (!draft || !data) {
    return (
      <div className="text-muted-foreground flex items-center justify-center py-16">
        <Loader2 size={18} className="mr-2 animate-spin" /> Yuklanmoqda...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs overrides={{ '/settings/marketplace': 'Marketplace tariflari' }} />
      <PageHeader
        title="Marketplace tariflari"
        description="Sotuvchidan olinadigan komissiya va xizmat haqi, omborga topshirish muddati va to‘lov kunlari. Allaqachon hisoblangan buyurtmalar o‘zgarmaydi."
      />

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-4 text-left font-normal" />
              {MODELS.map((m) => (
                <th key={m.id} className="p-4 text-left align-bottom">
                  <div className="text-brand-ink font-serif text-lg font-semibold">{m.title}</div>
                  <div className="text-muted-foreground text-xs font-normal">{m.note}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {ROWS.map((r) => (
              <tr key={r.key}>
                <th scope="row" className="p-4 text-left align-top font-normal">
                  <div className="font-medium">{r.label}</div>
                  <div className="text-muted-foreground text-xs">{r.hint}</div>
                </th>
                {MODELS.map((m) => (
                  <td key={m.id} className="p-4 align-top">
                    <Input
                      type="number"
                      min={0}
                      step={r.step}
                      aria-label={`${m.title} — ${r.label}`}
                      value={draft[r.key][m.id]}
                      onChange={(e) => setValue(r.key, m.id, e.target.value)}
                      className="max-w-[160px]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="space-y-2 p-5">
        <Label htmlFor="payout-days" className="font-medium">
          Sotuvchiga to‘lov kunlari
        </Label>
        <Input
          id="payout-days"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          placeholder="1, 16"
          className="max-w-[200px]"
        />
        <p className="text-muted-foreground text-xs">
          Oyning kunlari, vergul bilan (1–28). Yetkazilganiga 10 kun bo‘lgan (qaytarish muddati
          o‘tgan) savdolar shu kunlarda to‘lanadi.
        </p>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-base font-medium">
          {formatMoney(Number(EXAMPLE_PRICE))}lik 1 dona sotilsa, sotuvchiga qoladi
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          {MODELS.map((m) => {
            const s = settleItem(EXAMPLE_PRICE, 1, m.id, draft);
            return (
              <div key={m.id} className="space-y-1">
                <dt className="text-muted-foreground text-xs">{m.title}</dt>
                <dd className="text-brand-ink font-serif text-2xl font-semibold">
                  {formatMoney(Number(s.net))}
                </dd>
                <dd className="text-muted-foreground text-xs">
                  komissiya {formatMoney(Number(s.commission))}, xizmat haqi{' '}
                  {formatMoney(Number(s.fee))}
                </dd>
              </div>
            );
          })}
        </dl>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => void save({ ...draft, payoutDays: parsedDays })} disabled={saving}>
          {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
          Tariflarni saqlash
        </Button>
        <Button variant="outline" onClick={() => void save(data.defaults)} disabled={saving}>
          <RotateCcw size={14} className="mr-2" />
          Boshlang‘ich qiymatlar
        </Button>
        {data.updatedAt && (
          <span className="text-muted-foreground text-xs">
            Oxirgi o‘zgarish: {new Date(data.updatedAt).toLocaleString('ru-RU')}
          </span>
        )}
      </div>
    </div>
  );
}
