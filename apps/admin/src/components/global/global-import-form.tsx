// Xitoy tovarini katalogga import qilish formasi (operator).
// Havola qo'yiladi → platforma/ID avtomatik ajraladi → nom/rasm/kategoriya kiritiladi →
// narx JONLI hisoblanadi (`/api/global/catalog/preview`) → import.

'use client';

import { parseSourcingLink } from '@ecom/core-domain';
import {
  Button,
  Card,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  toast,
} from '@ecom/ui';
import { Loader2, Plane, Truck } from 'lucide-react';
import * as React from 'react';

import {
  WEIGHT_CATEGORY_LABEL,
  type ApiEnvelope,
  type FreightMode,
  type ImportResult,
  type PricePreview,
  type WeightCategory,
} from './global-import-types';
import { PricePreviewPanel } from './global-price-preview';

interface Props {
  onImported: (result: ImportResult) => void;
}

/** Bo'sh satr → undefined; son bo'lmasa ham undefined (0 ni yubormaslik uchun). */
function num(v: string): number | undefined {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) || n <= 0 ? undefined : n;
}

export function GlobalImportForm({ onImported }: Props) {
  const [url, setUrl] = React.useState('');
  const [nameUz, setNameUz] = React.useState('');
  const [nameRu, setNameRu] = React.useState('');
  const [descUz, setDescUz] = React.useState('');
  const [images, setImages] = React.useState('');

  const [priceCny, setPriceCny] = React.useState('');
  const [chinaDomesticCny, setChinaDomesticCny] = React.useState('');
  const [weightCategory, setWeightCategory] = React.useState<WeightCategory>('OTHER');
  const [manualWeightKg, setManualWeightKg] = React.useState('');
  const [dimL, setDimL] = React.useState('');
  const [dimW, setDimW] = React.useState('');
  const [dimH, setDimH] = React.useState('');
  const [freightMode, setFreightMode] = React.useState<FreightMode>('AUTO');
  const [marginPct, setMarginPct] = React.useState('');
  const [publish, setPublish] = React.useState(false);

  const [preview, setPreview] = React.useState<PricePreview | null>(null);
  const [previewing, setPreviewing] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Havola serverga bormasdan tekshiriladi — parser core-domain'da, server ham shuni ishlatadi
  const link = React.useMemo(() => (url.trim() ? parseSourcingLink(url) : null), [url]);
  const linkOk = Boolean(link?.ok && !link.needsResolve && link.itemId);

  const dims = React.useMemo(() => {
    const l = num(dimL);
    const w = num(dimW);
    const h = num(dimH);
    return l && w && h ? { l, w, h } : undefined;
  }, [dimL, dimW, dimH]);

  const pricingPayload = React.useMemo(
    () => ({
      priceCny: num(priceCny),
      chinaDomesticCny: num(chinaDomesticCny),
      weightCategory,
      manualWeightKg: num(manualWeightKg),
      dimsCm: dims,
      freightMode,
      marginPct: num(marginPct),
    }),
    [priceCny, chinaDomesticCny, weightCategory, manualWeightKg, dims, freightMode, marginPct],
  );

  // Narxni jonli hisoblash — kiritish to'xtagach 400ms keyin
  React.useEffect(() => {
    if (!pricingPayload.priceCny) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      setPreviewing(true);
      try {
        const res = await fetch('/api/global/catalog/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pricingPayload),
        });
        const body: ApiEnvelope<PricePreview> = await res.json();
        setPreview(body.success && body.data ? body.data : null);
      } catch {
        setPreview(null);
      } finally {
        setPreviewing(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [pricingPayload]);

  const canSubmit = linkOk && nameUz.trim().length > 0 && Boolean(preview) && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/global/catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          name: { uz: nameUz.trim(), ...(nameRu.trim() ? { ru: nameRu.trim() } : {}) },
          ...(descUz.trim() ? { description: { uz: descUz.trim() } } : {}),
          images: images
            .split(/[\s,]+/)
            .map((s) => s.trim())
            .filter(Boolean),
          publish,
          ...pricingPayload,
        }),
      });
      const body: ApiEnvelope<ImportResult> = await res.json();

      if (!res.ok || !body.success || !body.data) {
        toast({ title: body.error?.message ?? 'Import bajarilmadi', variant: 'destructive' });
        return;
      }

      toast({ title: `Import qilindi: ${body.data.sku}`, variant: 'success' });
      onImported(body.data);
      setUrl('');
      setNameUz('');
      setNameRu('');
      setDescUz('');
      setImages('');
      setPriceCny('');
      setManualWeightKg('');
      setDimL('');
      setDimW('');
      setDimH('');
      setPreview(null);
    } catch {
      toast({ title: 'Aloqa uzildi', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="space-y-5 p-5">
        <div className="space-y-2">
          <Label htmlFor="gi-url">Tovar havolasi (Taobao / Tmall / 1688 / Weidian)</Label>
          <Input
            id="gi-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://item.taobao.com/item.htm?id=..."
            autoComplete="off"
          />
          {link && !link.ok && (
            <p className="text-destructive text-sm">Havola qabul qilinmadi ({link.error})</p>
          )}
          {link?.ok && link.needsResolve && (
            <p className="text-sm text-amber-600">
              Qisqa havola — brauzerda ochib, to‘liq mahsulot havolasini qo‘ying
            </p>
          )}
          {linkOk && (
            <p className="text-muted-foreground text-sm">
              {link?.ok && `${link.platform} · ID ${link.itemId}`}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gi-name-uz">Nomi (o‘zbekcha)</Label>
            <Input
              id="gi-name-uz"
              value={nameUz}
              onChange={(e) => setNameUz(e.target.value)}
              placeholder="Simsiz quloqchin Pro 5"
              maxLength={300}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gi-name-ru">Nomi (ruscha, ixtiyoriy)</Label>
            <Input
              id="gi-name-ru"
              value={nameRu}
              onChange={(e) => setNameRu(e.target.value)}
              maxLength={300}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gi-desc">Tavsif (ixtiyoriy)</Label>
          <Textarea
            id="gi-desc"
            value={descUz}
            onChange={(e) => setDescUz(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gi-images">Rasm havolalari (bo‘sh joy yoki vergul bilan)</Label>
          <Textarea
            id="gi-images"
            value={images}
            onChange={(e) => setImages(e.target.value)}
            rows={2}
            placeholder="https://img.alicdn.com/... https://img.alicdn.com/..."
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="gi-price">Xitoydagi narx (¥)</Label>
            <Input
              id="gi-price"
              type="number"
              step="0.01"
              min={0}
              value={priceCny}
              onChange={(e) => setPriceCny(e.target.value)}
              placeholder="130"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gi-domestic">Xitoy ichki dostavka (¥, ixtiyoriy)</Label>
            <Input
              id="gi-domestic"
              type="number"
              step="0.01"
              min={0}
              value={chinaDomesticCny}
              onChange={(e) => setChinaDomesticCny(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Og‘irlik kategoriyasi</Label>
            <Select
              value={weightCategory}
              onValueChange={(v) => setWeightCategory(v as WeightCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(WEIGHT_CATEGORY_LABEL) as WeightCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {WEIGHT_CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gi-weight">Og‘irlik (kg, bilsangiz)</Label>
            <Input
              id="gi-weight"
              type="number"
              step="0.01"
              min={0}
              value={manualWeightKg}
              onChange={(e) => setManualWeightKg(e.target.value)}
              placeholder="kategoriya standarti ishlatiladi"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>O‘lchamlari (sm) — yengil-katta tovar uchun muhim</Label>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              min={0}
              value={dimL}
              onChange={(e) => setDimL(e.target.value)}
              placeholder="uz."
              aria-label="Uzunligi"
            />
            <Input
              type="number"
              min={0}
              value={dimW}
              onChange={(e) => setDimW(e.target.value)}
              placeholder="en."
              aria-label="Eni"
            />
            <Input
              type="number"
              min={0}
              value={dimH}
              onChange={(e) => setDimH(e.target.value)}
              placeholder="bal."
              aria-label="Balandligi"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Yetkazish usuli</Label>
            <div className="grid grid-cols-2 gap-2">
              {(['AUTO', 'AVIA'] as const).map((mode) => {
                const Icon = mode === 'AUTO' ? Truck : Plane;
                const active = freightMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setFreightMode(mode)}
                    aria-pressed={active}
                    className={[
                      'flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition',
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-input hover:border-primary/40',
                    ].join(' ')}
                  >
                    <Icon size={14} /> {mode === 'AUTO' ? 'Avto' : 'Avia'}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gi-margin">Marja (%, bo‘sh = standart)</Label>
            <Input
              id="gi-margin"
              type="number"
              step="1"
              min={0}
              value={marginPct === '' ? '' : String(Number(marginPct) * 100)}
              onChange={(e) => {
                const v = e.target.value;
                setMarginPct(v.trim() === '' ? '' : String(Number(v) / 100));
              }}
              placeholder="25"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
            className="h-4 w-4"
          />
          Darhol sotuvga chiqarilsin (aks holda qoralama)
        </label>

        <Button type="submit" disabled={!canSubmit}>
          {submitting && <Loader2 size={16} className="mr-2 animate-spin" />}
          Katalogga import qilish
        </Button>
      </Card>

      <PricePreviewPanel preview={preview} loading={previewing} />
    </form>
  );
}
