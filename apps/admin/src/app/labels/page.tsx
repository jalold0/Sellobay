'use client';

// /labels — Posilka yorliqlari (ADR 0017).
//
// Omborchining ishi: yetkazishga chiqqan buyurtmalarning yorlig'ini chop etib posilkaga
// yopishtirish. Kuryer yorliqdagi QR'ni skanerlaganda posilka unga o'tadi va ro'yxatdan
// chiqadi — shuning uchun bu yerda faqat hali omborda turganlar.

import { Button, Card, EmptyState, PageHeader, Skeleton, toast } from '@ecom/ui';
import { Printer, QrCode, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { formatDateTime, formatMoney } from '../../lib/format';

import type { ApiEnvelope } from '../../components/global/global-import-types';
import type { ParcelLabelData } from '../../components/labels/parcel-label';

interface PendingLabel extends ParcelLabelData {
  orderId: string;
  placedAt: string;
  claimed: boolean;
}

type Format = 'thermal' | 'a4';

function printUrl(ids: string[], format: Format): string {
  return `/labels/print?format=${format}&ids=${ids.join(',')}`;
}

export default function LabelsPage() {
  const [items, setItems] = React.useState<PendingLabel[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/labels', { cache: 'no-store' });
      const body: ApiEnvelope<{ items: PendingLabel[] }> = await res.json();
      if (body.success && body.data) {
        setItems(body.data.items);
        setSelected(new Set(body.data.items.map((i) => i.deliveryId)));
      } else {
        toast({ title: body.error?.message ?? 'Ro‘yxat yuklanmadi', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Aloqa uzildi — qayta urinib ko‘ring', variant: 'destructive' });
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const ids = items.filter((i) => selected.has(i.deliveryId)).map((i) => i.deliveryId);
  const allSelected = items.length > 0 && ids.length === items.length;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs overrides={{ '/labels': 'Posilka yorliqlari' }} />}
        title="Posilka yorliqlari"
        description="Yorliqni chop etib posilkaga yopishtiring. Kuryer QR’ni skanerlaganda posilka unga o‘tadi va ro‘yxatdan chiqadi."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className="mr-1" />
            Yangilash
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="Omborda kuryerni kutayotgan posilka yo‘q"
          description="To‘langan va yig‘ilgan buyurtmalar shu yerda paydo bo‘ladi"
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={allSelected}
                onChange={() =>
                  setSelected(allSelected ? new Set() : new Set(items.map((i) => i.deliveryId)))
                }
              />
              Hammasi ({items.length})
            </label>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm" disabled={ids.length === 0}>
                <a href={printUrl(ids, 'a4')} target="_blank" rel="noreferrer">
                  <Printer size={14} className="mr-1" />
                  A4 varaqda chop etish
                </a>
              </Button>
              <Button asChild size="sm" disabled={ids.length === 0}>
                <a href={printUrl(ids, 'thermal')} target="_blank" rel="noreferrer">
                  <Printer size={14} className="mr-1" />
                  Termoprinterda chop etish ({ids.length})
                </a>
              </Button>
            </div>
          </div>

          <Card>
            <ul className="divide-y">
              {items.map((l) => (
                <li key={l.deliveryId} className="flex items-center gap-4 p-4">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0"
                    aria-label={`${l.orderNumber} yorlig‘ini tanlash`}
                    checked={selected.has(l.deliveryId)}
                    onChange={() => toggle(l.deliveryId)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-sm font-bold tracking-wide">{l.parcelCode}</span>
                      <Link
                        href={`/orders/${l.orderId}`}
                        className="text-muted-foreground font-mono text-xs hover:underline"
                      >
                        {l.orderNumber}
                      </Link>
                      {l.claimed ? (
                        <span className="text-xs font-medium text-amber-700">
                          Kuryer olgan, hali skanerlamagan
                        </span>
                      ) : null}
                    </div>
                    <div className="text-muted-foreground truncate text-sm">
                      {l.recipient ?? '—'} · {l.area} · {l.pieces} dona
                    </div>
                  </div>
                  <div className="hidden shrink-0 text-right text-sm sm:block">
                    {l.codAmount ? (
                      <span className="font-semibold">Naqd {formatMoney(l.codAmount)}</span>
                    ) : (
                      <span className="text-muted-foreground">To‘langan</span>
                    )}
                    <div className="text-muted-foreground text-xs">
                      {formatDateTime(l.placedAt)}
                    </div>
                  </div>
                  <Button asChild variant="ghost" size="sm">
                    <a href={printUrl([l.deliveryId], 'thermal')} target="_blank" rel="noreferrer">
                      <Printer size={14} />
                      <span className="sr-only">Bitta yorliqni chop etish</span>
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
