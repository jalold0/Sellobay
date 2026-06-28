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
  Skeleton,
  toast,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowDownToLine, Filter, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { OrderStatusBadge, ORDER_STATUS_LABELS } from '../../components/status/order-status-badge';
import { PaymentStatusBadge } from '../../components/status/payment-status-badge';
import { listOrders, type AdminOrder } from '@/lib/auth/client';
import { formatDateTime, formatMoney, formatNumber } from '../../lib/format';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'Barchasi' },
  ...Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = React.useState<AdminOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [paymentFilter, setPaymentFilter] = React.useState<string>('all');
  const [deliveryFilter, setDeliveryFilter] = React.useState<string>('all');

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listOrders('all');
    if (res.success) setOrders(res.data.items);
    else toast({ title: res.error.message, variant: 'destructive' });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const data = React.useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (paymentFilter !== 'all' && o.paymentStatus !== paymentFilter) return false;
      if (deliveryFilter !== 'all' && o.deliveryMethod !== deliveryFilter) return false;
      return true;
    });
  }, [orders, statusFilter, paymentFilter, deliveryFilter]);

  const totalRevenue = data.reduce((s, o) => s + o.grandTotal, 0);

  const columns: ColumnDef<AdminOrder>[] = React.useMemo(
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
            <div className="truncate text-xs text-muted-foreground">
              {row.original.customerPhone}
            </div>
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
        accessorKey: 'itemCount',
        header: () => <div className="text-right">Tovarlar</div>,
        cell: ({ row }) => <div className="text-right">{row.original.itemCount}</div>,
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
            {formatDateTime(new Date(row.original.placedAt))}
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              Yangilash
            </Button>
            <Button variant="outline" size="sm">
              <ArrowDownToLine className="mr-2 h-4 w-4" /> Eksport
            </Button>
          </div>
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

      {loading ? (
        <div className="grid gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          searchPlaceholder="Buyurtma raqami, mijoz nomi yoki telefon..."
          emptyState={
            <EmptyState
              icon={ShoppingCart}
              title="Buyurtma topilmadi"
              description="Hali buyurtmalar yo`q yoki filtrlarni o`zgartiring"
            />
          }
        />
      )}
    </div>
  );
}
