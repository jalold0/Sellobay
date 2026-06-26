'use client';

import { Card, EmptyState, Skeleton, StatusBadge } from '@ecom/ui';
import { Package } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from '../../../../lib/order-status';
import { formatDate as fmtDate, formatMoney } from '../../../../lib/format';

interface OrderItem {
  id: string;
  number: string;
  status: keyof typeof ORDER_STATUS_LABELS;
  grandTotal: string;
  placedAt: string;
  itemCount: number;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

export default function MyOrdersPage() {
  const [orders, setOrders] = React.useState<OrderItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/orders', { credentials: 'same-origin' })
      .then((r) => r.json() as Promise<ApiResult<{ items: OrderItem[] }>>)
      .then((res) => {
        if (res.success && res.data) setOrders(res.data.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Buyurtmalarim</h1>
        <EmptyState
          icon={Package}
          title="Hali buyurtmalar yo`q"
          description="Birinchi buyurtmangizni amalga oshiring"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Buyurtmalarim</h1>
      <ul className="space-y-3">
        {orders.map((o) => (
          <Card key={o.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link
                  href={`/profile/orders/${o.id}`}
                  className="font-mono font-semibold hover:underline"
                >
                  {o.number}
                </Link>
                <div className="text-muted-foreground mt-0.5 text-xs">
                  {fmtDate(o.placedAt)} · {o.itemCount} ta mahsulot
                </div>
              </div>
              <StatusBadge tone={ORDER_STATUS_TONE[o.status] ?? 'neutral'}>
                {ORDER_STATUS_LABELS[o.status] ?? o.status}
              </StatusBadge>
              <div className="text-right">
                <div className="text-base font-bold">{formatMoney(Number(o.grandTotal))}</div>
                <Link
                  href={`/profile/orders/${o.id}`}
                  className="text-primary text-xs hover:underline"
                >
                  Batafsil
                </Link>
              </div>
            </div>
          </Card>
        ))}
      </ul>
    </div>
  );
}
