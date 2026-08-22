// /settings/global — kargo tariflari, kurs, marja va chetlanish chegaralari.
//
// Bu sahifa mavjud bo'lgani uchun tarif o'zgarganda kod tegilmaydi: operator
// shu yerda raqamni almashtiradi va yangi narxlar darhol shundan hisoblanadi.

'use client';

import { Button, Card, Input, Label, PageHeader, toast } from '@ecom/ui';
import { Loader2, RotateCcw } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../../components/layout/breadcrumbs';

import type { ApiEnvelope } from '../../../components/global/global-import-types';

interface Tariff {
  usdPerKg: number;
  seriesUsdPerKg?: number;
  seriesMinQty?: number;
  minChargeableKg: number;
  roundStepKg: number;
  volumetricDivisor: number;
  leadTimeDays: [number, number];
}

interface Effective {
  pricing: {
    cnyPerUsd: number;
    uzsPerUsd: number;
    fxBufferPct: number;
    agentFeePct: number;
    customsPct: number;
    paymentFeePct: number;
    marginPct: number;
    roundToUzs: number;
    weightRiskPct: number;
  };
  freight: { AUTO: Tariff; AVIA: Tariff };
  variance: { absorbPct: number; cancelPct: number };
  weightGuaranteePct: number;
  categoryWeightKg: Record<string, number>;
}

interface SettingsPayload {
  effective: Effective;
  override: Record<string, unknown>;
  updatedAt: string | null;
}

/** Foizli maydonlar — UI'da 5 deb ko'rsatiladi, bazaga 0.05 bo'lib ketadi. */
const PCT_FIELDS = new Set([
  'fxBufferPct',
  'agentFeePct',
  'customsPct',
  'paymentFeePct',
  'marginPct',
  'weightRiskPct',
  'absorbPct',
  'cancelPct',
  'weightGuaranteePct',
]);

const PRICING_LABEL: Record<string, string> = {
  cnyPerUsd: '1 USD = ? ¥',
  uzsPerUsd: "1 USD = ? so'm",
  fxBufferPct: 'Kurs zaxirasi (%)',
  agentFeePct: 'Agent haqi (%)',
  customsPct: 'Bojxona (%)',
  paymentFeePct: 'Ekvayring (%)',
  marginPct: 'Marja (%)',
  roundToUzs: "Yaxlitlash (so'm)",
  weightRiskPct: "Og'irlik zaxirasi (%)",
};

const TARIFF_LABEL: Record<string, string> = {
  usdPerKg: 'Dona uchun $/kg',
  seriesUsdPerKg: 'Seriya uchun $/kg',
  seriesMinQty: 'Seriya minimal soni',
  minChargeableKg: 'Minimal og‘irlik (kg)',
  roundStepKg: 'Yaxlitlash qadami (kg)',
  volumetricDivisor: 'Hajmiy bo‘luvchi',
};

export default function GlobalSettingsPage() {
  const [data, setData] = React.useState<SettingsPayload | null>(null);
  const [draft, setDraft] = React.useState<Effective | null>(null);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await fetch('/api/global/settings');
    const body: ApiEnvelope<SettingsPayload> = await res.json();
    if (body.success && body.data) {
      setData(body.data);
      setDraft(structuredClone(body.data.effective));
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function setPricing(key: string, raw: string) {
    if (!draft) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const value = PCT_FIELDS.has(key) ? n / 100 : n;
    setDraft({ ...draft, pricing: { ...draft.pricing, [key]: value } });
  }

  function setTariff(mode: 'AUTO' | 'AVIA', key: string, raw: string) {
    if (!draft) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setDraft({
      ...draft,
      freight: { ...draft.freight, [mode]: { ...draft.freight[mode], [key]: n } },
    });
  }

  function setLead(mode: 'AUTO' | 'AVIA', idx: 0 | 1, raw: string) {
    if (!draft) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const lead: [number, number] = [...draft.freight[mode].leadTimeDays] as [number, number];
    lead[idx] = Math.round(n);
    setDraft({
      ...draft,
      freight: { ...draft.freight, [mode]: { ...draft.freight[mode], leadTimeDays: lead } },
    });
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      const res = await fetch('/api/global/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing: draft.pricing,
          freight: draft.freight,
          variance: draft.variance,
          weightGuaranteePct: draft.weightGuaranteePct,
          categoryWeightKg: draft.categoryWeightKg,
        }),
      });
      const body: ApiEnvelope<SettingsPayload> = await res.json();
      if (!res.ok || !body.success || !body.data) {
        toast({ title: body.error?.message ?? 'Saqlanmadi', variant: 'destructive' });
        return;
      }
      setData(body.data);
      setDraft(structuredClone(body.data.effective));
      toast({
        title: 'Sozlamalar saqlandi — yangi narxlar shundan hisoblanadi',
        variant: 'success',
      });
    } catch {
      toast({ title: 'Aloqa uzildi', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function resetAll() {
    setSaving(true);
    try {
      const res = await fetch('/api/global/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body: ApiEnvelope<SettingsPayload> = await res.json();
      if (body.success && body.data) {
        setData(body.data);
        setDraft(structuredClone(body.data.effective));
        toast({ title: 'Standart qiymatlarga qaytarildi', variant: 'success' });
      }
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

  const shown = (key: string, value: number) => (PCT_FIELDS.has(key) ? value * 100 : value);

  return (
    <div className="space-y-6">
      <Breadcrumbs overrides={{ '/settings/global': 'Global sozlamalar' }} />

      <PageHeader
        title="Global sozlamalar"
        description="Kargo tariflari, kurs, marja va narx chetlanishi chegaralari. O‘zgartirilgach yangi narxlar shu qiymatlardan hisoblanadi — kod o‘zgartirilmaydi."
      />

      <Card className="space-y-4 p-5">
        <h2 className="text-base font-medium">Kurs va foizlar</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {Object.entries(draft.pricing).map(([key, value]) => (
            <div key={key} className="space-y-1.5">
              <Label htmlFor={`p-${key}`}>{PRICING_LABEL[key] ?? key}</Label>
              <Input
                id={`p-${key}`}
                type="number"
                step="any"
                min={0}
                value={shown(key, value)}
                onChange={(e) => setPricing(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </Card>

      {(['AUTO', 'AVIA'] as const).map((mode) => (
        <Card key={mode} className="space-y-4 p-5">
          <h2 className="text-base font-medium">
            {mode === 'AUTO' ? 'Avto kargo' : 'Avia kargo'} tarifi
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                'usdPerKg',
                'seriesUsdPerKg',
                'seriesMinQty',
                'minChargeableKg',
                'roundStepKg',
                'volumetricDivisor',
              ] as const
            ).map((key) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`${mode}-${key}`}>{TARIFF_LABEL[key]}</Label>
                <Input
                  id={`${mode}-${key}`}
                  type="number"
                  step="any"
                  min={0}
                  value={draft.freight[mode][key] ?? ''}
                  onChange={(e) => setTariff(mode, key, e.target.value)}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Muddat (kun): dan — gacha</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={1}
                  value={draft.freight[mode].leadTimeDays[0]}
                  onChange={(e) => setLead(mode, 0, e.target.value)}
                  aria-label={`${mode} minimal kun`}
                />
                <Input
                  type="number"
                  min={1}
                  value={draft.freight[mode].leadTimeDays[1]}
                  onChange={(e) => setLead(mode, 1, e.target.value)}
                  aria-label={`${mode} maksimal kun`}
                />
              </div>
            </div>
          </div>
        </Card>
      ))}

      <Card className="space-y-4 p-5">
        <h2 className="text-base font-medium">Narx chetlanishi</h2>
        <p className="text-muted-foreground text-sm">
          Xitoyda narx oshganda: chidam foizigacha o‘zimiz yutamiz, undan yuqorisida mijozdan
          so‘raladi, bekor chegarasidan oshsa bekor qilish tavsiya etiladi.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="v-absorb">O‘zimiz yutamiz (%)</Label>
            <Input
              id="v-absorb"
              type="number"
              step="any"
              min={0}
              value={draft.variance.absorbPct * 100}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  variance: { ...draft.variance, absorbPct: Number(e.target.value) / 100 },
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-cancel">Bekor tavsiyasi (%)</Label>
            <Input
              id="v-cancel"
              type="number"
              step="any"
              min={0}
              value={draft.variance.cancelPct * 100}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  variance: { ...draft.variance, cancelPct: Number(e.target.value) / 100 },
                })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-guarantee">Og‘irlik kafolati (%)</Label>
            <Input
              id="v-guarantee"
              type="number"
              step="any"
              min={0}
              value={draft.weightGuaranteePct * 100}
              onChange={(e) =>
                setDraft({ ...draft, weightGuaranteePct: Number(e.target.value) / 100 })
              }
            />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-base font-medium">Kategoriya og‘irliklari (kg)</h2>
        <p className="text-muted-foreground text-sm">
          Kargo tortgan o‘lchovlar to‘plangach shu raqamlarni haqiqiy o‘rtachaga almashtiring.
        </p>
        <div className="grid gap-4 sm:grid-cols-4">
          {Object.entries(draft.categoryWeightKg).map(([cat, value]) => (
            <div key={cat} className="space-y-1.5">
              <Label htmlFor={`w-${cat}`}>{cat}</Label>
              <Input
                id={`w-${cat}`}
                type="number"
                step="0.01"
                min={0}
                value={value}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    categoryWeightKg: {
                      ...draft.categoryWeightKg,
                      [cat]: Number(e.target.value),
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
          Saqlash
        </Button>
        <Button variant="outline" onClick={resetAll} disabled={saving}>
          <RotateCcw size={14} className="mr-2" />
          Standartga qaytarish
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
