'use client';

// /labels/print?ids=a,b&format=thermal|a4 — yorliqlarni chop etish (ADR 0017).
//
// Panel ramkasisiz (sidebar yo'q) ochiladi: brauzerning chop etish oynasi faqat yorliqlarni
// ko'rsin. `thermal` — har yorliq alohida 58×40 mm sahifa (termoprinter rulon), `a4` —
// varaqqa 3×7 = 21 ta (oddiy printer, keyin qaychi bilan kesiladi).

import { Button } from '@ecom/ui';
import { Printer } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';

import {
  buildQrSvgs,
  PARCEL_LABEL_CSS,
  ParcelLabel,
  type ParcelLabelData,
} from '../../../components/labels/parcel-label';

import type { ApiEnvelope } from '../../../components/global/global-import-types';

type Format = 'thermal' | 'a4';

const PAGE_CSS: Record<Format, string> = {
  thermal: `
@page { size: 58mm 40mm; margin: 0; }
.label-sheet { display: flex; flex-direction: column; gap: 4mm; align-items: center; }
@media print {
  .label-sheet { gap: 0; }
  .label-sheet .parcel-label { page-break-after: always; break-after: page; }
}`,
  a4: `
@page { size: A4; margin: 8mm 18mm; }
.label-sheet { display: grid; grid-template-columns: repeat(3, 58mm); grid-auto-rows: 40mm; justify-content: center; }
.label-sheet .parcel-label { outline: 0.2mm dashed #999; }
@media print { .label-sheet .parcel-label:nth-child(21n) { break-after: page; page-break-after: always; } }`,
};

function PrintSheet() {
  const params = useSearchParams();
  const ids = params.get('ids') ?? '';
  const format: Format = params.get('format') === 'a4' ? 'a4' : 'thermal';

  const [labels, setLabels] = React.useState<ParcelLabelData[] | null>(null);
  const [svgs, setSvgs] = React.useState<Map<string, string>>(new Map());
  const [error, setError] = React.useState<string | null>(null);
  const printed = React.useRef(false);

  React.useEffect(() => {
    if (!ids) {
      setError('Yorliq tanlanmagan — «Posilka yorliqlari» sahifasidan tanlang.');
      return;
    }
    void (async () => {
      const res = await fetch(`/api/labels?ids=${encodeURIComponent(ids)}`, { cache: 'no-store' });
      const json = (await res.json()) as ApiEnvelope<{ items: ParcelLabelData[] }>;
      if (!json.success || !json.data) {
        setError(json.error?.message ?? 'Yorliqlar yuklanmadi');
        return;
      }
      setSvgs(await buildQrSvgs(json.data.items));
      setLabels(json.data.items);
    })();
  }, [ids]);

  // Hammasi chizilgach — bir marta avtomatik chop etish oynasi.
  React.useEffect(() => {
    if (!labels || labels.length === 0 || printed.current) return;
    printed.current = true;
    const handle = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(handle);
  }, [labels]);

  return (
    <div className="min-h-screen bg-neutral-100 py-6 print:bg-white print:py-0">
      {/* Matn sifatida bersak, React SSR'da qo'shtirnoqni ekranlaydi va gidratsiya buziladi. */}
      {/* eslint-disable-next-line react/no-danger -- CSS bizning konstantalarimiz */}
      <style dangerouslySetInnerHTML={{ __html: PARCEL_LABEL_CSS + PAGE_CSS[format] }} />
      <div className="mx-auto mb-6 flex max-w-xl items-center justify-between gap-3 px-4 print:hidden">
        <div className="text-sm">
          {labels
            ? `${labels.length} ta yorliq · ${format === 'a4' ? 'A4 varaq, 21 tadan' : 'termo 58×40 mm'}`
            : (error ?? 'Yuklanmoqda…')}
        </div>
        <Button onClick={() => window.print()} disabled={!labels?.length}>
          <Printer className="mr-1.5 h-4 w-4" />
          Chop etish
        </Button>
      </div>
      {labels ? (
        <div className="label-sheet">
          {labels.map((l) => (
            <ParcelLabel key={l.deliveryId} label={l} qrSvg={svgs.get(l.deliveryId) ?? ''} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function LabelsPrintPage() {
  return (
    <React.Suspense>
      <PrintSheet />
    </React.Suspense>
  );
}
