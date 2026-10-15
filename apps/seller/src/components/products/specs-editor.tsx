'use client';

// Tovar xususiyatlari: material, tarkib, mamlakat... Xaridor tovar
// sahifasidagi «Xususiyatlari» bo'limida ko'radi.
//
// Ma'lum turlar ro'yxatdan tanlanadi — ularning nomi saytda uch tilda
// chiqadi. Ro'yxatda yo'q xususiyat uchun «Boshqa» tanlanib, nomi yoziladi.
// Qoidalar serverda (@ecom/core-domain normalizeProductSpecs).

import { Button, Input, Label } from '@ecom/ui';
import { Plus, Trash2 } from 'lucide-react';
import * as React from 'react';

export interface SpecRow {
  /** Ma'lum tur kaliti yoki '' — «Boshqa». */
  key: string;
  label: string;
  value: string;
}

/** Sayt tarjimasidagi `product.spec.*` bilan bir xil nomlar (uz). */
export const SPEC_PRESETS: { key: string; label: string; placeholder: string }[] = [
  { key: 'material', label: 'Material', placeholder: 'Paxta' },
  { key: 'composition', label: 'Tarkibi', placeholder: '95% paxta, 5% elastan' },
  { key: 'country', label: 'Ishlab chiqarilgan mamlakat', placeholder: 'O‘zbekiston' },
  { key: 'season', label: 'Mavsum', placeholder: 'Bahor–kuz' },
  { key: 'care', label: 'Parvarish', placeholder: '30°C da yuving' },
  { key: 'warranty', label: 'Kafolat', placeholder: '12 oy' },
];

const MAX_ROWS = 20;

export function emptySpecRow(): SpecRow {
  return { key: '', label: '', value: '' };
}

/** Serverga yuboriladigan shakl: bo'sh qatorlar tashlanadi. */
export function specsPayload(rows: SpecRow[]) {
  return rows
    .filter((r) => r.value.trim())
    .map((r) => (r.key ? { key: r.key, value: r.value } : { label: r.label, value: r.value }));
}

/** Serverdan kelgan ro'yxatni tahrirlash qatorlariga. */
export function specsToRows(specs: { key?: string; label?: string; value: string }[] | undefined) {
  return (specs ?? []).map((s) => ({ key: s.key ?? '', label: s.label ?? '', value: s.value }));
}

export function SpecsEditor({
  value,
  onChange,
  idPrefix = 'spec',
}: {
  value: SpecRow[];
  onChange: (rows: SpecRow[]) => void;
  idPrefix?: string;
}) {
  const update = (i: number, patch: Partial<SpecRow>) =>
    onChange(value.map((row, j) => (j === i ? { ...row, ...patch } : row)));

  // Bir tur ikki marta tanlanmasin — server ham rad etadi.
  const used = new Set(value.map((r) => r.key).filter(Boolean));

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Material, tarkib, mamlakat kabi ma’lumotlar xaridorga tanlashda yordam beradi.
        </p>
      ) : null}
      {value.map((row, i) => {
        const preset = SPEC_PRESETS.find((p) => p.key === row.key);
        return (
          <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]">
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}-type-${i}`} className="sr-only">
                Xususiyat turi
              </Label>
              <select
                id={`${idPrefix}-type-${i}`}
                value={row.key}
                onChange={(e) => update(i, { key: e.target.value })}
                className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              >
                {SPEC_PRESETS.map((p) => (
                  <option key={p.key} value={p.key} disabled={used.has(p.key) && p.key !== row.key}>
                    {p.label}
                  </option>
                ))}
                <option value="">Boshqa (nomini yozing)</option>
              </select>
              {row.key === '' ? (
                <Input
                  aria-label="Xususiyat nomi"
                  value={row.label}
                  maxLength={60}
                  onChange={(e) => update(i, { label: e.target.value })}
                  placeholder="Masalan: Yoqa turi"
                />
              ) : null}
            </div>
            <Input
              id={`${idPrefix}-value-${i}`}
              aria-label={`${preset?.label ?? (row.label || 'Xususiyat')} qiymati`}
              value={row.value}
              maxLength={200}
              onChange={(e) => update(i, { value: e.target.value })}
              placeholder={preset?.placeholder ?? 'Qiymati'}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              aria-label="Xususiyatni olib tashlash"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
      {value.length < MAX_ROWS ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const free = SPEC_PRESETS.find((p) => !used.has(p.key));
            onChange([...value, { ...emptySpecRow(), key: free?.key ?? '' }]);
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Xususiyat qo‘shish
        </Button>
      ) : null}
    </div>
  );
}
