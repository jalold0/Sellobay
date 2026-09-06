'use client';

import { Skeleton, cn, toast } from '@ecom/ui';
import { ArrowLeft, Check, CircleDot, MapPin, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import {
  GlobalOrderTracker,
  type CustomerGlobalView,
} from '../../../../../components/global/global-order-tracker';
import { formatDate as fmtDate, formatMoney } from '../../../../../lib/format';

type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PAID'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'REFUNDED';

interface OrderDetail {
  id: string;
  number: string;
  status: OrderStatus;
  scope?: 'LOCAL' | 'GLOBAL';
  global?: CustomerGlobalView | null;
  paymentProvider: string | null;
  paymentStatus: string | null;
  paymentReview: boolean;
  subtotal: string;
  shippingTotal: string;
  discountTotal: string;
  grandTotal: string;
  notes: string | null;
  deliveryMethod: 'HOME_DELIVERY' | 'PICKUP_POINT' | 'EXPRESS';
  placedAt: string;
  editable: boolean;
  shippingAddress: {
    recipientName: string;
    phone: string;
    region: string;
    city: string;
    street: string;
    building: string | null;
    apartment: string | null;
  } | null;
  pickupPoint: { name: Record<string, string> | string; city: string; street: string } | null;
  itemCount: number;
  items: Array<{
    id: string;
    quantity: number;
    nameSnapshot: Record<string, string> | string;
    unitPrice: string;
    totalPrice: string;
    slug: string | null;
    imageUrl: string | null;
  }>;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

function timelineIndex(status: OrderStatus): number {
  switch (status) {
    case 'PENDING':
    case 'CONFIRMED':
    case 'PAID':
      return 0;
    case 'PROCESSING':
    case 'PACKED':
      return 1;
    case 'SHIPPED':
    case 'OUT_FOR_DELIVERY':
      return 2;
    case 'DELIVERED':
      return 3;
    default:
      return 0;
  }
}

const TIMELINE_STEPS = ['received', 'packed', 'onTheWay', 'delivered'] as const;

export default function OrderDetailPage() {
  const params = useParams<{ id: string; locale: string }>();
  const id = params?.id ?? '';
  const locale = params?.locale ?? 'uz';
  const t = useTranslations('profile.orderDetail');
  const to = useTranslations('order');
  const tOrders = useTranslations('profile.ordersPage');

  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`, { credentials: 'same-origin' });
      const json = (await res.json()) as ApiResult<{ order: OrderDetail }>;
      if (json.success && json.data) setOrder(json.data.order);
      else setNotFound(true);
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onCancel = async () => {
    if (!window.confirm(t('cancelConfirm'))) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: '{}',
      });
      const json = (await res.json()) as ApiResult<unknown>;
      if (json.success) {
        toast({ title: t('cancelled'), variant: 'success' });
        await load();
      } else {
        toast({ title: json.error?.message ?? 'Xato', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Xato', variant: 'destructive' });
    }
    setCancelling(false);
  };

  const pick = (v: Record<string, string> | string): string =>
    typeof v === 'string' ? v : (v[locale] ?? v.uz ?? Object.values(v)[0] ?? '');

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-brand-ink text-lg font-bold">{t('notFound')}</p>
        <Link href="/profile/orders" className="text-primary mt-4 inline-block font-semibold">
          {t('back')}
        </Link>
      </div>
    );
  }

  const current = timelineIndex(order.status);
  // Yakunlangan (bekor/qaytarilgan/pul qaytarilgan) — fulfillment timeline ko'rsatilmaydi
  // (aks holda "Qabul qilindi" bosqichida "yashil belgi" bilan qotib qolardi).
  const isClosed =
    order.status === 'CANCELLED' || order.status === 'RETURNED' || order.status === 'REFUNDED';
  // Karta to'lov holatini lokalizatsiya qilamiz (raw enum ko'rsatmaymiz)
  const KNOWN_PAY_STATUSES = [
    'PENDING',
    'AUTHORIZED',
    'PAID',
    'PARTIALLY_REFUNDED',
    'REFUNDED',
    'FAILED',
    'CANCELLED',
  ];
  const paymentStatusLabel = order.paymentReview
    ? to('paymentReview')
    : order.paymentStatus && KNOWN_PAY_STATUSES.includes(order.paymentStatus)
      ? to(`paymentStatus.${order.paymentStatus}`)
      : '—';

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <Link
        href="/profile/orders"
        className="text-muted-foreground hover:text-brand-ink inline-flex items-center gap-1.5 text-sm font-semibold"
      >
        <ArrowLeft size={16} /> {t('back')}
      </Link>

      {/* Header */}
      <div className="border-border rounded-[18px] border bg-white p-6 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-brand-ink text-lg font-extrabold">№ {order.number}</div>
            <div className="text-muted-foreground mt-1 text-[12.5px]">
              {fmtDate(order.placedAt)} · {tOrders('itemsCount', { count: order.itemCount })}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.04em]',
                isClosed ? 'bg-chip text-muted-foreground' : 'bg-crimson-chip text-primary',
              )}
            >
              {to(`status.${order.status}`)}
            </span>
            {order.paymentReview ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.04em] text-amber-700">
                {to('paymentReview')}
              </span>
            ) : null}
          </div>
        </div>

        {/* To'lov tekshiruvi izohi */}
        {order.paymentReview ? (
          <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
            {t('reviewNote')}
          </div>
        ) : null}

        {/* Global (Xitoy) buyurtma — o'z kuzatuv chizig'i */}
        {order.global ? (
          <div className="mt-6">
            <GlobalOrderTracker view={order.global} />
          </div>
        ) : null}

        {/* Lokal timeline — GLOBAL buyurtmada ko'rsatilmaydi: u kargo bosqichlari
            bilan yurmaydi va mijozni chalg'itadi (yuqorida global kuzatuv bor). */}
        {!isClosed && !order.global ? (
          <div className="mt-6 flex items-center">
            {TIMELINE_STEPS.map((step, i) => {
              const done = i <= current;
              return (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'grid h-8 w-8 place-items-center rounded-full border-2',
                        done
                          ? 'border-primary bg-primary text-white'
                          : 'border-border text-muted-foreground',
                      )}
                    >
                      {done ? <Check size={15} /> : <CircleDot size={15} />}
                    </div>
                    <span className="text-muted-foreground text-[10.5px] font-semibold">
                      {tOrders(`timeline.${step}`)}
                    </span>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 ? (
                    <div
                      className={cn('mx-1 h-0.5 flex-1', i < current ? 'bg-primary' : 'bg-border')}
                    />
                  ) : null}
                </React.Fragment>
              );
            })}
          </div>
        ) : null}
      </div>

      {/* Mahsulotlar + summalar */}
      <div className="border-border rounded-[18px] border bg-white p-6 md:p-7">
        <h2 className="text-brand-ink mb-4 text-lg font-bold">{t('items')}</h2>
        <ul className="divide-y">
          {order.items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 py-3">
              <div className="bg-muted h-12 w-12 shrink-0 overflow-hidden rounded-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.imageUrl ?? ''} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-brand-ink truncate text-sm font-semibold">
                  {pick(it.nameSnapshot)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {it.quantity} × {formatMoney(Number(it.unitPrice))}
                </div>
              </div>
              <div className="text-brand-ink text-sm font-bold">
                {formatMoney(Number(it.totalPrice))}
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-2 border-t pt-3 text-sm">
          <Row label={t('subtotal')} value={formatMoney(Number(order.subtotal))} />
          <Row label={t('shipping')} value={formatMoney(Number(order.shippingTotal))} />
          {Number(order.discountTotal) > 0 ? (
            <Row
              label={t('discount')}
              value={`-${formatMoney(Number(order.discountTotal))}`}
              accent="text-success"
            />
          ) : null}
          <div className="text-brand-ink flex justify-between border-t pt-2 text-base font-extrabold">
            <span>{t('total')}</span>
            <span>{formatMoney(Number(order.grandTotal))}</span>
          </div>
        </div>
      </div>

      {/* Yetkazib berish + to'lov */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border-border rounded-[18px] border bg-white p-6">
          <div className="text-brand-ink mb-2 flex items-center gap-2 text-sm font-bold">
            <MapPin size={15} /> {order.pickupPoint ? t('pickupPoint') : t('deliveryAddress')}
          </div>
          {order.pickupPoint ? (
            <div className="text-muted-foreground text-[13px]">
              <div className="text-brand-ink font-semibold">{pick(order.pickupPoint.name)}</div>
              <div>
                {order.pickupPoint.city}, {order.pickupPoint.street}
              </div>
            </div>
          ) : order.shippingAddress ? (
            <div className="text-muted-foreground text-[13px]">
              <div className="text-brand-ink font-semibold">
                {order.shippingAddress.recipientName}
              </div>
              <div>{order.shippingAddress.phone}</div>
              <div className="mt-1">
                {order.shippingAddress.region}, {order.shippingAddress.city},{' '}
                {[
                  order.shippingAddress.street,
                  order.shippingAddress.building,
                  order.shippingAddress.apartment,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-[13px]">—</div>
          )}
        </div>

        <div className="border-border rounded-[18px] border bg-white p-6">
          <div className="text-brand-ink mb-2 text-sm font-bold">{t('payment')}</div>
          <div className="text-muted-foreground space-y-1 text-[13px]">
            <div className="flex justify-between">
              <span>{order.paymentProvider ?? '—'}</span>
              <span
                className={cn(
                  'font-semibold',
                  order.paymentStatus === 'PAID' ? 'text-success' : 'text-amber-700',
                )}
              >
                {paymentStatusLabel}
              </span>
            </div>
            <div className="text-brand-ink flex justify-between font-bold">
              <span>{t('total')}</span>
              <span>{formatMoney(Number(order.grandTotal))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bekor qilish (faqat tahrirlanadigan PENDING) */}
      {order.editable ? (
        <button
          type="button"
          onClick={() => void onCancel()}
          disabled={cancelling}
          className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-red-200 px-5 py-2.5 text-[13px] font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
        >
          <X size={15} /> {t('cancel')}
        </button>
      ) : null}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className={cn('flex justify-between', accent)}>
      <span className={accent ? '' : 'text-muted-foreground'}>{label}</span>
      <span>{value}</span>
    </div>
  );
}
