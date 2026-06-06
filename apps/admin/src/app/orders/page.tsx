'use client';

import {
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowDownToLine, Filter, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { OrderStatusBadge, ORDER_STATUS_LABELS } from '../../components/status/order-status-badge';
import { PaymentStatusBadge } from '../../components/status/payment-status-badge';
import { formatDateTime, formatMoney, formatNumber } from '../../lib/format';
import { mockOrders, type Order } from '../../lib/mock';

const STATUS_OPTIONS: Array<{ value: 'all' | Order['status']; label: string }> = [
  { value: 'all', label: 'Barchasi' },
  ...(Object.entries(ORDER_STATUS_LABELS).map(
    ([value, label]) => ({ value: value as Order['status'], label }),
  )),
];

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [paymentFilter, setPaymentFilter] = React.useState<string>('all');
  const [deliveryFilter, setDeliveryFilter] = React.useState<string>('all');

  const data = React.useMemo(() => {
    return mockOrders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (paymentFilter !== 'all' && o.paymentStatus !== paymentFilter) return false;
      if (deliveryFilter !== 'all' && o.deliveryMethod !== deliveryFilter) return false;
      return true;
    });
  }, [statusFilter, paymentFilter, deliveryFilter]);

  const totalRevenue = data.reduce((s, o) => s + o.grandTotal, 0);

  const columns: ColumnDef<Order>[] = React.useMemo(
    () => [
      {
        accessorKey: 'number',
        header: '№',
        cell: ({ row }) => (
          <Link
            href={`/orders/${row.original.id}`}
            className="font-mono text-sm font-medium hover:underline"
          >
            {row.original.number}
          </Link>
        ),
      },
      {
        accessorKey: 'customerName',
        header: 'Mijoz',
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-medium">{row.original.customerName}</div>
            <div className="truncate text-xs text-muted-foreground">{row.original.customerPhone}</div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'paymentStatus',
        header: "To`lov",
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <PaymentStatusBadge status={row.original.paymentStatus} />
            <div className="text-xs text-muted-foreground">{row.original.paymentProvider}</div>
          </div>
        ),
      },
      {
        accessorKey: 'deliveryMethod',
        header: 'Yetkazib berish',
        cell: ({ row }) => (
          <div className="text-sm">
            <div>
              {row.original.deliveryMethod === 'HOME_DELIVERY'
                ? 'Uyga'
                : row.original.deliveryMethod === 'PICKUP_POINT'
                ? 'Pickup'
                : 'Express'}
            </div>
            <div className="text-xs text-muted-foreground">{row.original.city}</div>
          </div>
        ),
      },
      {
        accessorKey: 'itemsCount',
        header: () => <div className="text-right">Tovarlar</div>,
        cell: ({ row }) => <div className="text-right">{row.original.itemsCount}</div>,
      },
      {
        accessorKey: 'grandTotal',
        header: () => <div className="text-right">Summa</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold">{formatMoney(row.original.grandTotal)}</div>
        ),
      },
      {
        accessorKey: 'placedAt',
        header: 'Sana',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {formatDateTime(row.original.placedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Buyurtmalar"
        description={`${formatNumber(data.length)} ta buyurtma · jami ${formatMoney(totalRevenue)}`}
        actions={
          <Button variant="outline" size="sm">
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Eksport
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="To`lov" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="PAID">To`langan</SelectItem>
              <SelectItem value="PENDING">Kutilmoqda</SelectItem>
              <SelectItem value="FAILED">Muvaffaqiyatsiz</SelectItem>
              <SelectItem value="REFUNDED">Qaytarilgan</SelectItem>
            </SelectContent>
          </Select>
          <Select value={deliveryFilter} onValueChange={setDeliveryFilter}>
            <SelectTrigger className="h-9 w-[170px]">
              <SelectValue placeholder="Yetkazib berish" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barchasi</SelectItem>
              <SelectItem value="HOME_DELIVERY">Uyga</SelectItem>
              <SelectItem value="PICKUP_POINT">Pickup</SelectItem>
              <SelectItem value="EXPRESS">Express</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Buyurtma raqami, mijoz nomi yoki telefon..."
        emptyState={
          <EmptyState
            icon={ShoppingCart}
            title="Buyurtma topilmadi"
            description="Filtrlarni o`zgartiring yoki keyinroq tekshiring"
          />
        }
      />
    </div>
  );
}
