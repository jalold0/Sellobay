'use client';

import { EmptyState, Skeleton, cn } from '@ecom/ui';
import { Globe, Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { formatDate as fmtDate, formatMoney } from '../../../../lib/format';

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

interface OrderItemLine {
  id: string;
  quantity: number;
  imageUrl: string | null;
  slug: string | null;
}

interface OrderRow {
  id: string;
  number: string;
  status: OrderStatus;
  scope?: 'LOCAL' | 'GLOBAL';
  grandTotal: string;
  placedAt: string;
  paidAt: string | null;
  paymentReview?: boolean;
  itemCount: number;
  items: OrderItemLine[];
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
}

const TIMELINE_STEPS = ['received', 'packed', 'onTheWay', 'delivered'] as const;

// Status → timeline joriy bosqichi (0..3)
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

type Kind = 'active' | 'delivered' | 'cancelled';
function orderKind(status: OrderStatus): Kind {
  if (status === 'DELIVERED') return 'delivered';
  if (status === 'CANCELLED' || status === 'RETURNED' || status === 'REFUNDED') return 'cancelled';
  return 'active';
}

type Filter = 'all' | 'onTheWay' | 'delivered';

export default function MyOrdersPage() {
  const t = useTranslations('profile.ordersPage');
  const to = useTranslations('order');
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<Filter>('all');

  React.useEffect(() => {
    fetch('/api/orders', { credentials: 'same-origin' })
      .then((r) => r.json() as Promise<ApiResult<{ items: OrderRow[] }>>)
      .then((res) => {
        if (res.success && res.data) setOrders(res.data.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const StatusChip = ({ status }: { status: OrderStatus }) => {
    const kind = orderKind(status);
    const cls =
      kind === 'delivered'
        ? 'bg-success-chip text-success'
        : kind === 'cancelled'
          ? 'bg-chip text-muted-foreground'
          : 'bg-crimson-chip text-primary';
    return (
      <span
        className={cn(
          'rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.04em]',
          cls,
        )}
      >
        {to(`status.${status}`)}
      </span>
    );
  };

  // Global (Xitoydan) buyurtma belgisi — lokal buyurtmadan ajratib tursin
  const GlobalChip = () => (
    <span className="bg-crimson-chip text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.04em]">
      <Globe size={10} /> Global
    </span>
  );

  // Karta orqali to'lov cheki tekshirilayotganini ko'rsatuvchi belgi
  const ReviewChip = () => (
    <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.04em] text-amber-700">
      {to('paymentReview')}
    </span>
  );

  const MetaLine = ({ order }: { order: OrderRow }) => (
    <div className="text-muted-foreground mt-1.5 text-[12.5px]">
      {fmtDate(order.placedAt)} · {t('itemsCount', { count: order.itemCount })}
    </div>
  );

  const ActiveOrderCard = ({ order }: { order: OrderRow }) => {
    const current = timelineIndex(order.status);
    return (
      <div className="border-border rounded-[18px] border bg-white p-6 md:p-7">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-brand-ink text-[15px] font-extrabold">№ {order.number}</span>
              <StatusChip status={order.status} />
              {order.scope === 'GLOBAL' ? <GlobalChip /> : null}
              {order.paymentReview ? <ReviewChip /> : null}
            </div>
            <MetaLine order={order} />
          </div>
          <div className="text-right">
            <div className="text-brand-ink text-base font-extrabold">
              {formatMoney(Number(order.grandTotal))}
            </div>
            {order.paidAt && (
              <div className="text-success mt-0.5 text-xs font-semibold">{to('status.PAID')}</div>
            )}
          </div>
        </div>

        {/* 4-bosqich timeline */}
        <div className="my-6 flex items-center">
          {TIMELINE_STEPS.map((step, i) => {
            const done = i < current;
            const active = i === current;
            return (
              <React.Fragment key={step}>
                <div className="flex w-[120px] flex-col items-center gap-[7px]">
                  <span
                    className={cn(
                      'grid h-[22px] w-[22px] place-items-center rounded-full text-[11px] font-extrabold',
                      done
                        ? 'bg-primary text-white'
                        : active
                          ? 'border-primary border-[2.5px] bg-white'
                          : 'border-2 border-[#d5d5d9]',
                    )}
                  >
                    {done ? (
                      '✓'
                    ) : active ? (
                      <span className="bg-primary h-2 w-2 rounded-full" />
                    ) : null}
                  </span>
                  <span
                    className={cn(
                      'text-[11px]',
                      done
                        ? 'text-brand-ink font-semibold'
                        : active
                          ? 'text-primary font-bold'
                          : 'font-semibold text-[#9a9aa2]',
                    )}
                  >
                    {t(`timeline.${step}`)}
                  </span>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-[-28px] mb-[22px] h-[2.5px] flex-1',
                      i < current ? 'bg-primary' : 'bg-border',
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer strip — mahsulot thumb'lari + kuzatish */}
        <div className="bg-muted mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-[18px] py-3.5">
          <div className="flex gap-2.5">
            {order.items.slice(0, 3).map((it) => (
              <div
                key={it.id}
                className="border-border relative h-14 w-12 overflow-hidden rounded-lg border bg-white"
              >
                {it.imageUrl && (
                  <Image src={it.imageUrl} alt="" fill sizes="48px" className="object-cover" />
                )}
              </div>
            ))}
          </div>
          <Link
            href={`/profile/orders/${order.id}`}
            className="border-brand-ink text-brand-ink hover:bg-muted rounded-full border-[1.5px] bg-white px-5 py-2.5 text-[12.5px] font-bold transition"
          >
            {t('trackOnMap')}
          </Link>
        </div>
      </div>
    );
  };

  const PastOrderRow = ({ order }: { order: OrderRow }) => {
    const isDelivered = orderKind(order.status) === 'delivered';
    return (
      <div className="border-border flex flex-wrap items-center justify-between gap-3 rounded-[18px] border bg-white px-6 py-[22px] md:px-7">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-brand-ink text-[14.5px] font-extrabold">№ {order.number}</span>
            <StatusChip status={order.status} />
            {order.scope === 'GLOBAL' ? <GlobalChip /> : null}
            {order.paymentReview ? <ReviewChip /> : null}
          </div>
          <MetaLine order={order} />
        </div>
        <div className="flex items-center gap-6">
          <span className="text-brand-ink text-[15px] font-extrabold">
            {formatMoney(Number(order.grandTotal))}
          </span>
          <Link
            href={`/profile/orders/${order.id}`}
            className="border-border text-brand-ink hover:bg-muted rounded-full border-[1.5px] px-5 py-2.5 text-[12.5px] font-bold transition"
          >
            {isDelivered ? t('reorder') : t('detail')}
          </Link>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-[18px]" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-brand-ink text-2xl font-bold md:text-[28px]">{t('title')}</h1>
        <EmptyState icon={Package} title={t('emptyTitle')} description={t('emptyDesc')} />
      </div>
    );
  }

  const filtered = orders.filter((o) => {
    if (filter === 'all') return true;
    // "Yo'lda" — faqat haqiqatan jo'natilgan/yetkazilayotgan buyurtmalar (yangi PENDING emas)
    if (filter === 'onTheWay') return o.status === 'SHIPPED' || o.status === 'OUT_FOR_DELIVERY';
    return orderKind(o.status) === 'delivered';
  });

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'onTheWay', label: t('filterOnTheWay') },
    { key: 'delivered', label: t('filterDelivered') },
  ];

  return (
    <div className="space-y-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-brand-ink text-2xl font-bold md:text-[28px]">{t('title')}</h1>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'rounded-full px-[18px] py-2 text-[12.5px] font-semibold transition',
                filter === f.key
                  ? 'bg-brand-ink font-bold text-white'
                  : 'border-border hover:border-foreground/30 border-[1.5px] bg-white text-[#3a3a40]',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((o) =>
          orderKind(o.status) === 'active' ? (
            <ActiveOrderCard key={o.id} order={o} />
          ) : (
            <PastOrderRow key={o.id} order={o} />
          ),
        )}
      </div>
    </div>
  );
}
