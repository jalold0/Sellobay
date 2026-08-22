// Bitta global zayavka kartasi. Ko'rsatiladigan amal STATUSGA qarab o'zgaradi:
// NEW/PRICE_CHECK → narx tekshiruvi · CONFIRMED → sotib olindi ·
// PURCHASED → trek raqam · IN_CARGO → yetkazildi.

'use client';

import { Button, Card, Input, toast } from '@ecom/ui';
import { ExternalLink, Loader2 } from 'lucide-react';
import * as React from 'react';

import { FULFILLMENT_STATUS_LABEL, VARIANCE_LABEL } from './fulfillment-types';

import type { FulfillmentView } from './fulfillment-types';
import type { ApiEnvelope } from './global-import-types';

const uzs = (n: number) => `${new Intl.NumberFormat('ru-RU').format(Math.round(n))} so'm`;

export function FulfillmentCard({
  item,
  onChanged,
}: {
  item: FulfillmentView;
  onChanged: (updated: FulfillmentView) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [priceCny, setPriceCny] = React.useState('');
  const [purchaseRef, setPurchaseRef] = React.useState('');
  const [trackNumber, setTrackNumber] = React.useState('');
  const [weightKg, setWeightKg] = React.useState('');

  async function send(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/global/fulfillment/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body: ApiEnvelope<FulfillmentView & { variance?: { decision: string } }> =
        await res.json();
      if (!res.ok || !body.success || !body.data) {
        toast({ title: body.error?.message ?? 'Bajarilmadi', variant: 'destructive' });
        return;
      }
      const decision = body.data.variance?.decision;
      toast({
        title: decision ? (VARIANCE_LABEL[decision] ?? decision) : 'Saqlandi',
        variant: decision === 'CANCEL_SUGGESTED' ? 'destructive' : 'success',
      });
      onChanged(body.data);
    } catch {
      toast({ title: 'Aloqa uzildi', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  }

  const spinner = busy ? <Loader2 size={14} className="mr-2 animate-spin" /> : null;

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{item.order.number}</span>
            <span className="bg-muted rounded-full px-2 py-0.5 text-[11px]">
              {FULFILLMENT_STATUS_LABEL[item.status] ?? item.status}
            </span>
            <span className="bg-muted rounded-full px-2 py-0.5 text-[11px]">
              {item.freightMode}
            </span>
          </div>
          <div className="mt-1 text-sm">
            {item.order.customer ?? '—'} · {item.order.phone ?? '—'}
          </div>
          {item.order.address && (
            <div className="text-muted-foreground text-xs">{item.order.address}</div>
          )}
        </div>
        <div className="text-right">
          <div className="text-lg font-medium">{uzs(item.paidTotal)}</div>
          <div className="text-muted-foreground text-xs">mijoz to‘lagan</div>
        </div>
      </div>

      <ul className="space-y-1 border-t pt-3 text-sm">
        {item.items.map((line) => (
          <li key={line.sku} className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate">
              {line.name} × {line.quantity}
              {line.sourceUrl && (
                <a
                  href={line.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="ml-1.5 inline-flex items-center"
                  aria-label="Manba havolasi"
                >
                  <ExternalLink size={11} />
                </a>
              )}
            </span>
            <span className="text-muted-foreground shrink-0 text-xs">
              {line.priceCny} ¥ · {uzs(line.totalPrice)}
            </span>
          </li>
        ))}
      </ul>

      {item.verifiedTotal !== null && (
        <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs">
          Tekshiruv: {uzs(item.paidTotal)} → {uzs(item.verifiedTotal)}
          {item.absorbedTotal ? ` · biz yutdik ${uzs(item.absorbedTotal)}` : ''}
          {item.extraChargeTotal ? ` · mijozdan ${uzs(item.extraChargeTotal)}` : ''}
          {item.varianceDecision ? ` · ${VARIANCE_LABEL[item.varianceDecision] ?? ''}` : ''}
        </div>
      )}

      {item.trackNumber && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Trek: <span className="font-mono">{item.trackNumber}</span>
          {item.actualWeightKg ? ` · ${item.actualWeightKg} kg` : ''}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        {(item.status === 'NEW' ||
          item.status === 'PRICE_CHECK' ||
          item.status === 'PRICE_CHANGED') && (
          <>
            <Input
              type="number"
              step="0.01"
              min={0}
              value={priceCny}
              onChange={(e) => setPriceCny(e.target.value)}
              placeholder="Hozirgi narx (¥) — bo‘sh = katalogdagi"
              className="h-9 max-w-[280px]"
            />
            <Button
              size="sm"
              disabled={busy}
              onClick={() =>
                send({
                  action: 'VERIFY',
                  ...(priceCny.trim() ? { priceCny: Number(priceCny) } : {}),
                })
              }
            >
              {spinner}Narxni tekshirish
            </Button>
          </>
        )}

        {item.status === 'PRICE_CHANGED' && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => send({ action: 'STATUS', status: 'CONFIRMED' })}
            >
              {spinner}Baribir tasdiqlash
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => send({ action: 'STATUS', status: 'CANCELLED' })}
            >
              Bekor qilish
            </Button>
          </>
        )}

        {item.status === 'CONFIRMED' && (
          <>
            <Input
              value={purchaseRef}
              onChange={(e) => setPurchaseRef(e.target.value)}
              placeholder="Platformadagi zakaz raqami"
              className="h-9 max-w-[280px]"
            />
            <Button
              size="sm"
              disabled={busy || !purchaseRef.trim()}
              onClick={() => send({ action: 'PURCHASE', purchaseRef: purchaseRef.trim() })}
            >
              {spinner}Sotib olindi
            </Button>
          </>
        )}

        {(item.status === 'PURCHASED' || item.status === 'IN_CARGO') && (
          <>
            <Input
              value={trackNumber}
              onChange={(e) => setTrackNumber(e.target.value)}
              placeholder="Trek raqam"
              className="h-9 max-w-[220px]"
            />
            <Input
              type="number"
              step="0.01"
              min={0}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="Tortilgan kg"
              className="h-9 max-w-[150px]"
            />
            <Button
              size="sm"
              disabled={busy || !trackNumber.trim()}
              onClick={() =>
                send({
                  action: 'TRACK',
                  trackNumber: trackNumber.trim(),
                  ...(weightKg.trim() ? { actualWeightKg: Number(weightKg) } : {}),
                })
              }
            >
              {spinner}Kargoga kiritildi
            </Button>
          </>
        )}

        {item.status === 'IN_CARGO' && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => send({ action: 'STATUS', status: 'DELIVERED' })}
          >
            {spinner}Yetkazildi
          </Button>
        )}
      </div>
    </Card>
  );
}
