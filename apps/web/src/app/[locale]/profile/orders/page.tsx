'use client';

import { Card, EmptyState, StatusBadge } from '@ecom/ui';
import { Package } from 'lucide-react';
import Link from 'next/link';

import { ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from '../../../../lib/order-status';
import { formatDate, formatMoney } from '../../../../lib/format';

// Mock buyurtmalar — backend tayyor bo'lganda useQuery'ga ko'chiriladi
const MOCK_ORDERS: Array<{
  id: string;
  number: string;
  status: keyof typeof ORDER_STATUS_LABELS;
  total: number;
  itemsCount: number;
  placedAt: string;
}> = [
  { id: 'o1', number: 'ORD-2026-00001234', status: 'DELIVERED', total: 2_350_000, itemsCount: 3, placedAt: '2026-05-15' },
  { id: 'o2', number: 'ORD-2026-00001456', status: 'SHIPPED', total: 890_000, itemsCount: 1, placedAt: '2026-06-01' },
  { id: 'o3', number: 'ORD-2026-00001789', status: 'PROCESSING', total: 1_490_000, itemsCount: 2, placedAt: '2026-06-04' },
];

export default function MyOrdersPage() {
  if (MOCK_ORDERS.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Hali buyurtmalar yo`q"
        description="Birinchi buyurtmangizni amalga oshiring"
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Buyurtmalarim</h1>
      <ul className="space-y-3">
        {MOCK_ORDERS.map((o) => (
          <Card key={o.id} className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/profile/orders/${o.id}`} className="font-mono font-semibold hover:underline">
                  {o.number}
                </Link>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {formatDate(o.placedAt)} · {o.itemsCount} ta mahsulot
                </div>
              </div>
              <StatusBadge tone={ORDER_STATUS_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</StatusBadge>
              <div className="text-right">
                <div className="text-base font-bold">{formatMoney(o.total)}</div>
                <Link href={`/profile/orders/${o.id}`} className="text-xs text-primary hover:underline">
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
