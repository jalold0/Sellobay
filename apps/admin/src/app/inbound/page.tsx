'use client';

// /inbound — Ombor qabuli (ADR 0015).
//
// Omborchining ishi: sotuvchi olib kelgan qadoqni buyurtma raqami bo'yicha topib «Qabul qilindi»
// deyish, omborning o'z (FBO) tovarini yig'ib «Yig'ildi» deyish. Buyurtmaning hamma qismi kelgach
// u avtomatik «Qadoqlandi» bo'lib yetkazishga chiqadi. Kechikayotgan sotuvchilar alohida —
// qo'ng'iroq qilish uchun telefoni bilan.

import { Button, Card, EmptyState, PageHeader, Skeleton, toast } from '@ecom/ui';
import { PackageCheck, Phone, RefreshCw, Warehouse } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { formatDateTime } from '../../lib/format';

import type { ApiEnvelope } from '../../components/global/global-import-types';

type ShipmentStatus = 'NEW' | 'ACCEPTED' | 'PACKED';

interface InboundShipment {
  id: string;
  model: 'FBS' | 'FBO';
  status: ShipmentStatus;
  deadlineAt: string;
  packedAt: string | null;
  createdAt: string;
  order: { id: string; number: string };
  seller: { id: string; brandName: string; phone: string | null } | null;
  items: Array<{
    id: string;
    name: { uz?: string; ru?: string; en?: string } | string;
    sku: string;
    quantity: number;
  }>;
}

function itemName(name: InboundShipment['items'][number]['name']): string {
  if (typeof name === 'string') return name;
  return name.uz ?? name.ru ?? name.en ?? 'Mahsulot';
}

function overdueBy(deadlineAt: string, now: number): string | null {
  const diff = now - new Date(deadlineAt).getTime();
  if (diff <= 0) return null;
  const hours = Math.max(1, Math.round(diff / 3_600_000));
  return hours >= 48 ? `${Math.round(hours / 24)} kun kechikdi` : `${hours} soat kechikdi`;
}

function ShipmentRow({
  s,
  now,
  action,
}: {
  s: InboundShipment;
  now: number;
  action?: React.ReactNode;
}) {
  const late = overdueBy(s.deadlineAt, now);
  return (
    <li className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link
            href={`/orders/${s.order.id}`}
            className="font-mono text-sm font-semibold hover:underline"
          >
            {s.order.number}
          </Link>
          <span className="text-sm font-medium">{s.seller?.brandName ?? 'Sellobay ombori'}</span>
          {late ? <span className="text-destructive text-xs font-medium">{late}</span> : null}
        </div>
        <ul className="text-muted-foreground space-y-0.5 text-sm">
          {s.items.map((it) => (
            <li key={it.id} className="flex gap-2">
              <span className="text-foreground min-w-0 truncate">{itemName(it.name)}</span>
              <span className="shrink-0">× {it.quantity}</span>
              <span className="shrink-0 text-xs leading-5">{it.sku}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <span className="text-muted-foreground text-xs">
          muddat {formatDateTime(new Date(s.deadlineAt))}
        </span>
        {action}
      </div>
    </li>
  );
}

export default function InboundPage() {
  const [items, setItems] = React.useState<InboundShipment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shipments');
      const body: ApiEnvelope<{ items: InboundShipment[] }> = await res.json();
      if (body.success && body.data) setItems(body.data.items);
      else toast({ title: body.error?.message ?? 'Ro‘yxat yuklanmadi', variant: 'destructive' });
    } catch {
      toast({ title: 'Aloqa uzildi — qayta urinib ko‘ring', variant: 'destructive' });
    }
    setNow(Date.now());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function receive(s: InboundShipment) {
    setBusy(s.id);
    try {
      const res = await fetch(`/api/shipments/${s.id}/receive`, { method: 'POST' });
      const body: ApiEnvelope<{ orderReady: boolean; orderPacked: boolean }> = await res.json();
      if (!res.ok || !body.success || !body.data) {
        toast({ title: body.error?.message ?? 'Saqlanmadi', variant: 'destructive' });
        await load();
        return;
      }
      setItems((prev) => prev.filter((x) => x.id !== s.id));
      toast({
        title:
          s.model === 'FBS' ? `${s.order.number} — qabul qilindi` : `${s.order.number} — yig‘ildi`,
        description: body.data.orderReady
          ? 'Buyurtmaning hamma tovari omborda — yetkazishga chiqdi'
          : 'Buyurtmaning boshqa qismlari hali kutilmoqda',
        variant: 'success',
      });
    } catch {
      toast({ title: 'Aloqa uzildi — qayta urinib ko‘ring', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  }

  const arrived = items.filter((s) => s.model === 'FBS' && s.status === 'PACKED');
  const toPick = items.filter((s) => s.model === 'FBO');
  const atSeller = items.filter((s) => s.model === 'FBS' && s.status !== 'PACKED');
  const lateAtSeller = atSeller.filter((s) => overdueBy(s.deadlineAt, now)).length;

  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={<Breadcrumbs overrides={{ '/inbound': 'Ombor qabuli' }} />}
        title="Ombor qabuli"
        description="Sotuvchi olib kelgan tovarni qabul qiling, ombordagisini yig‘ing — buyurtmaning hamma qismi kelgach u o‘zi yetkazishga chiqadi"
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
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="Kutilayotgan jo‘natma yo‘q"
          description="To‘langan buyurtmalarning tovarlari shu yerda paydo bo‘ladi"
        />
      ) : (
        <>
          <section className="space-y-3" aria-labelledby="arrived">
            <h2 id="arrived" className="text-brand-ink font-serif text-xl font-semibold">
              Sotuvchi olib keladi ({arrived.length})
            </h2>
            <p className="text-muted-foreground text-sm">
              Sotuvchi qadoqlagan. Qadoqni buyurtma raqami bo‘yicha toping, tarkibini tekshiring va
              qabul qiling.
            </p>
            {arrived.length === 0 ? (
              <p className="text-muted-foreground text-sm">Hozircha qadoqlangan jo‘natma yo‘q.</p>
            ) : (
              <Card>
                <ul className="divide-y">
                  {arrived.map((s) => (
                    <ShipmentRow
                      key={s.id}
                      s={s}
                      now={now}
                      action={
                        <Button size="sm" disabled={busy === s.id} onClick={() => void receive(s)}>
                          <PackageCheck size={14} className="mr-1" />
                          Qabul qilindi
                        </Button>
                      }
                    />
                  ))}
                </ul>
              </Card>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="pick">
            <h2 id="pick" className="text-brand-ink font-serif text-xl font-semibold">
              Ombordan yig‘ish ({toPick.length})
            </h2>
            {toPick.length === 0 ? (
              <p className="text-muted-foreground text-sm">Yig‘iladigan tovar yo‘q.</p>
            ) : (
              <Card>
                <ul className="divide-y">
                  {toPick.map((s) => (
                    <ShipmentRow
                      key={s.id}
                      s={s}
                      now={now}
                      action={
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === s.id}
                          onClick={() => void receive(s)}
                        >
                          Yig‘ildi
                        </Button>
                      }
                    />
                  ))}
                </ul>
              </Card>
            )}
          </section>

          <section className="space-y-3" aria-labelledby="seller">
            <h2 id="seller" className="text-brand-ink font-serif text-xl font-semibold">
              Sotuvchida ({atSeller.length})
            </h2>
            <p className="text-muted-foreground text-sm">
              Sotuvchi panelda hali qadoqlamagan. Tovarni olib kelgan bo‘lsa — shu yerda qabul
              qiling.
              {lateAtSeller > 0
                ? ` ${lateAtSeller} tasi muddatdan o‘tgan — sotuvchiga qo‘ng‘iroq qiling yoki buyurtmani bekor qiling.`
                : ''}
            </p>
            {atSeller.length === 0 ? null : (
              <Card>
                <ul className="divide-y">
                  {atSeller.map((s) => (
                    <ShipmentRow
                      key={s.id}
                      s={s}
                      now={now}
                      action={
                        <>
                          {s.seller?.phone ? (
                            <a
                              href={`tel:${s.seller.phone}`}
                              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                            >
                              <Phone size={12} /> {s.seller.phone}
                            </a>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy === s.id}
                            onClick={() => void receive(s)}
                          >
                            Qabul qilindi
                          </Button>
                        </>
                      }
                    />
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
