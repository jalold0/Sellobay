'use client';

// Sotuvchi buyurtmalari (ADR 0015). Sahifaning asosiy ishi — «nimani, qachongacha omborga olib
// kelish kerak»: tepada FBS jo'natmalari muddati bo'yicha navbatda, pastda barcha buyurtmalar.

import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  Skeleton,
  toast,
} from '@ecom/ui';
import { Check, PackageCheck, RefreshCw, ShoppingCart, Warehouse } from 'lucide-react';
import * as React from 'react';

import { formatDateTime, formatMoney } from '../../lib/format';

type ShipmentStatus = 'NEW' | 'ACCEPTED' | 'PACKED' | 'HANDED_OVER' | 'CANCELLED';

interface OrderItem {
  id: string;
  sku: string;
  name: { uz?: string; ru?: string; en?: string } | string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  shipmentId: string | null;
}

interface Shipment {
  id: string;
  model: 'FBS' | 'FBO';
  status: ShipmentStatus;
  deadlineAt: string;
  acceptedAt: string | null;
  packedAt: string | null;
  handedOverAt: string | null;
}

interface Order {
  id: string;
  number: string;
  status: string;
  placedAt: string;
  sellerSubtotal: string;
  items: OrderItem[];
  shipments: Shipment[];
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

const STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  PACKED: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-violet-100 text-violet-800',
  OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-red-100 text-red-800',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Kutilmoqda',
  CONFIRMED: 'Tasdiqlandi',
  PAID: 'To‘landi',
  PROCESSING: 'Tayyorlanmoqda',
  PACKED: 'Omborda tayyor',
  SHIPPED: 'Jo‘natildi',
  OUT_FOR_DELIVERY: 'Yetkazilmoqda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
  RETURNED: 'Qaytarildi',
  REFUNDED: 'Pul qaytarildi',
};

const SHIPMENT_LABEL: Record<ShipmentStatus, string> = {
  NEW: 'Qabul qilinmagan',
  ACCEPTED: 'Qadoqlanmoqda',
  PACKED: 'Omborga olib keling',
  HANDED_OVER: 'Omborga topshirildi',
  CANCELLED: 'Bekor qilindi',
};

const OPEN: ShipmentStatus[] = ['NEW', 'ACCEPTED', 'PACKED'];

function localizeName(name: OrderItem['name']): string {
  if (typeof name === 'string') return name;
  return name.uz ?? name.ru ?? name.en ?? 'Mahsulot';
}

/** «14 soat qoldi» / «2 kun qoldi» / «3 soat kechikdi». */
function deadlineText(
  deadlineAt: string,
  now: number,
): { text: string; late: boolean; soon: boolean } {
  const diff = new Date(deadlineAt).getTime() - now;
  const hours = Math.round(Math.abs(diff) / 3_600_000);
  const span =
    hours >= 48
      ? `${Math.round(hours / 24)} kun`
      : hours >= 1
        ? `${hours} soat`
        : 'bir necha daqiqa';
  if (diff < 0) return { text: `${span} kechikdi`, late: true, soon: false };
  return { text: `${span} qoldi`, late: false, soon: diff < 6 * 3_600_000 };
}

/** Qabul → Qadoq → Omborda: jo'natma qaysi bosqichda. */
function Steps({ status }: { status: ShipmentStatus }) {
  const reached = status === 'NEW' ? 0 : status === 'ACCEPTED' ? 1 : status === 'PACKED' ? 2 : 3;
  const steps = ['Qabul', 'Qadoq', 'Omborda'];
  return (
    <ol className="flex items-center gap-1.5 text-[11px]" aria-label="Jo‘natma bosqichlari">
      {steps.map((label, i) => {
        const done = i < reached;
        return (
          <li key={label} className="flex items-center gap-1.5">
            <span
              className={
                done
                  ? 'bg-primary text-primary-foreground flex h-4 w-4 items-center justify-center rounded-full'
                  : 'border-muted-foreground/40 h-4 w-4 rounded-full border'
              }
              aria-hidden
            >
              {done ? <Check size={10} /> : null}
            </span>
            <span className={done ? 'text-foreground' : 'text-muted-foreground'}>{label}</span>
            {i < steps.length - 1 ? <span className="bg-border h-px w-4" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [now, setNow] = React.useState(() => Date.now());

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', { credentials: 'same-origin' });
      const json = (await res.json()) as ApiResult<{ items: Order[] }>;
      if (json.success && json.data) setOrders(json.data.items);
      else
        toast({
          title: json.error?.message ?? 'Buyurtmalar yuklanmadi — sahifani yangilang',
          variant: 'destructive',
        });
    } catch {
      toast({
        title: 'Internet aloqasini tekshirib, qayta urinib ko‘ring',
        variant: 'destructive',
      });
    }
    setNow(Date.now());
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
    const t = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  const queue = React.useMemo(
    () =>
      orders
        .flatMap((o) =>
          o.shipments
            .filter((s) => s.model === 'FBS' && OPEN.includes(s.status))
            .map((s) => ({
              order: o,
              shipment: s,
              items: o.items.filter((it) => it.shipmentId === s.id),
            })),
        )
        .sort((a, b) => a.shipment.deadlineAt.localeCompare(b.shipment.deadlineAt)),
    [orders],
  );

  async function advance(shipmentId: string, action: 'accept' | 'pack') {
    setBusy(shipmentId);
    try {
      const res = await fetch(`/api/shipments/${shipmentId}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json()) as ApiResult<{ shipment: { status: ShipmentStatus } }>;
      if (!json.success || !json.data) {
        toast({ title: json.error?.message ?? 'Saqlanmadi', variant: 'destructive' });
        await load();
        return;
      }
      const status = json.data.shipment.status;
      const at = new Date().toISOString();
      setOrders((prev) =>
        prev.map((o) => ({
          ...o,
          shipments: o.shipments.map((s) =>
            s.id === shipmentId
              ? {
                  ...s,
                  status,
                  acceptedAt: s.acceptedAt ?? at,
                  packedAt: status === 'PACKED' ? at : s.packedAt,
                }
              : s,
          ),
        })),
      );
      toast({
        title: action === 'accept' ? 'Qabul qilindi' : 'Qadoqlandi',
        description:
          action === 'accept'
            ? 'Endi tovarni qadoqlang'
            : 'Tovarni omborga olib keling — ombor qabul qilgach buyurtma yetkazishga ketadi',
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Internet aloqasini tekshirib, qayta urinib ko‘ring',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  }

  const late = queue.filter((q) => deadlineText(q.shipment.deadlineAt, now).late).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Buyurtmalar"
        description="Buyurtmani qabul qiling, qadoqlang va muddatigacha omborga olib keling — yetkazishni biz qilamiz"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className="mr-1" />
            Yangilash
          </Button>
        }
      />

      <section className="space-y-3" aria-labelledby="queue-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="queue-title" className="text-brand-ink font-serif text-xl font-semibold">
            Omborga topshirish
          </h2>
          {!loading && queue.length > 0 ? (
            <p className="text-muted-foreground text-sm">
              {queue.length} ta jo‘natma
              {late > 0 ? <span className="text-destructive">, {late} tasi kechikkan</span> : null}
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="grid gap-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : queue.length === 0 ? (
          <Card>
            <CardContent className="flex items-center gap-3 p-4 text-sm">
              <PackageCheck size={18} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">
                Hozir topshiriladigan jo‘natma yo‘q. Yangi buyurtma to‘langanda shu yerda paydo
                bo‘ladi.
              </span>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {queue.map(({ order, shipment, items }) => {
              const d = deadlineText(shipment.deadlineAt, now);
              return (
                <li key={shipment.id}>
                  <Card className={d.late ? 'border-destructive/60' : undefined}>
                    <CardContent className="grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-mono text-sm font-semibold">{order.number}</span>
                          <Steps status={shipment.status} />
                        </div>
                        <ul className="space-y-0.5 text-sm">
                          {items.map((it) => (
                            <li key={it.id} className="flex gap-2">
                              <span className="min-w-0 truncate">{localizeName(it.name)}</span>
                              <span className="shrink-0">× {it.quantity}</span>
                              <span className="text-muted-foreground shrink-0 text-xs leading-5">
                                {it.sku}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 md:flex-col md:items-end">
                        <div className="md:text-right">
                          <div
                            className={
                              d.late
                                ? 'text-destructive text-sm font-semibold'
                                : d.soon
                                  ? 'text-sm font-semibold text-amber-700'
                                  : 'text-sm font-medium'
                            }
                          >
                            {d.text}
                          </div>
                          <div className="text-muted-foreground text-xs">
                            muddat {formatDateTime(shipment.deadlineAt)}
                          </div>
                        </div>
                        {shipment.status === 'NEW' ? (
                          <Button
                            size="sm"
                            disabled={busy === shipment.id}
                            onClick={() => void advance(shipment.id, 'accept')}
                          >
                            Qabul qilish
                          </Button>
                        ) : shipment.status === 'ACCEPTED' ? (
                          <Button
                            size="sm"
                            disabled={busy === shipment.id}
                            onClick={() => void advance(shipment.id, 'pack')}
                          >
                            Qadoqlandi deb belgilash
                          </Button>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                            <Warehouse size={14} /> Ombor qabul qilishini kutmoqda
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="all-title">
        <h2 id="all-title" className="text-brand-ink font-serif text-xl font-semibold">
          Barcha buyurtmalar
        </h2>
        {loading ? (
          <Skeleton className="h-40" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="Hali buyurtma yo‘q"
            description="Tovaringiz sotilganda buyurtmalar shu yerda chiqadi"
          />
        ) : (
          <Card>
            <ul className="divide-y">
              {orders.map((o) => (
                <li key={o.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-start">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{o.number}</span>
                      <Badge className={STATUS_TONE[o.status] ?? 'bg-muted'}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </Badge>
                      {o.shipments.map((s) => (
                        <span key={s.id} className="text-muted-foreground text-xs">
                          {s.model}:{' '}
                          {s.model === 'FBO' && OPEN.includes(s.status)
                            ? 'ombor yig‘moqda'
                            : SHIPMENT_LABEL[s.status].toLowerCase()}
                        </span>
                      ))}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {formatDateTime(o.placedAt)}
                    </div>
                    <div className="truncate text-sm">
                      {o.items.map((it) => `${localizeName(it.name)} × ${it.quantity}`).join(', ')}
                    </div>
                  </div>
                  <div className="text-sm font-semibold sm:text-right">
                    {formatMoney(Number(o.sellerSubtotal))}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
