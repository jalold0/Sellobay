'use client';

import {
  Button,
  Card,
  DataTable,
  KpiCard,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowDownToLine, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import {
  SELLER_ORDER_STATUS_LABELS,
  SellerOrderStatusBadge,
} from '../../components/order-status-badge';
import { formatDateTime, formatMoney, formatNumber } from '../../lib/format';
import { sellerOrders, type SellerOrder } from '../../lib/mock';

export default function SellerOrdersPage() {
  const [tab, setTab] = React.useState('new');
  const [cityFilter, setCityFilter] = React.useState('all');

  const counts = {
    new: sellerOrders.filter((o) => ['PENDING', 'CONFIRMED', 'PAID'].includes(o.status)).length,
    processing: sellerOrders.filter((o) => ['PROCESSING', 'PACKED'].includes(o.status)).length,
    shipped: sellerOrders.filter((o) => ['SHIPPED'].includes(o.status)).length,
    delivered: sellerOrders.filter((o) => o.status === 'DELIVERED').length,
    issues: sellerOrders.filter((o) => ['CANCELLED', 'RETURNED'].includes(o.status)).length,
    all: sellerOrders.length,
  };

  const data = React.useMemo(() => {
    let list = sellerOrders;
    if (tab === 'new') list = list.filter((o) => ['PENDING', 'CONFIRMED', 'PAID'].includes(o.status));
    else if (tab === 'processing') list = list.filter((o) => ['PROCESSING', 'PACKED'].includes(o.status));
    else if (tab === 'shipped') list = list.filter((o) => o.status === 'SHIPPED');
    else if (tab === 'delivered') list = list.filter((o) => o.status === 'DELIVERED');
    else if (tab === 'issues') list = list.filter((o) => ['CANCELLED', 'RETURNED'].includes(o.status));
    if (cityFilter !== 'all') list = list.filter((o) => o.city === cityFilter);
    return list;
  }, [tab, cityFilter]);

  const cities = Array.from(new Set(sellerOrders.map((o) => o.city)));
  const revenue = data.reduce((s, o) => s + o.grandTotal, 0);

  const columns: ColumnDef<SellerOrder>[] = [
    {
      accessorKey: 'number',
      header: '№',
      cell: ({ row }) => (
        <Link href={`/orders/${row.original.id}`} className="font-mono font-medium hover:underline">
          {row.original.number}
        </Link>
      ),
    },
    {
      accessorKey: 'customerName',
      header: 'Mijoz',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.customerName}</div>
          <div className="text-xs text-muted-foreground">{row.original.city}</div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <SellerOrderStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'itemsCount',
      header: () => <div className="text-right">Tovarlar</div>,
      cell: ({ row }) => <div className="text-right">{row.original.itemsCount}</div>,
    },
    {
      accessorKey: 'grandTotal',
      header: () => <div className="text-right">Summa</div>,
      cell: ({ row }) => <div className="text-right font-semibold">{formatMoney(row.original.grandTotal)}</div>,
    },
    {
      accessorKey: 'placedAt',
      header: 'Sana',
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.original.placedAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buyurtmalar"
        description="Sizning mahsulotlaringizga tegishli buyurtmalar"
        actions={
          <Button variant="outline" size="sm">
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Eksport
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Yangi" value={formatNumber(counts.new)} accent="warning" />
        <KpiCard label="Jarayonda" value={formatNumber(counts.processing)} accent="info" />
        <KpiCard label="Yetkazilgan" value={formatNumber(counts.delivered)} accent="success" />
        <KpiCard label="Tanlangan davr daromad" value={formatMoney(revenue)} accent="primary" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="new">Yangi ({counts.new})</TabsTrigger>
          <TabsTrigger value="processing">Jarayonda ({counts.processing})</TabsTrigger>
          <TabsTrigger value="shipped">Yo`lda ({counts.shipped})</TabsTrigger>
          <TabsTrigger value="delivered">Yetkazildi ({counts.delivered})</TabsTrigger>
          <TabsTrigger value="issues">Muammolar ({counts.issues})</TabsTrigger>
          <TabsTrigger value="all">Barchasi ({counts.all})</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Shahar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha shaharlar</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="ml-auto text-xs text-muted-foreground">{Object.keys(SELLER_ORDER_STATUS_LABELS).length} ta status mavjud</div>
        </div>
      </Card>

      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder="Buyurtma raqami yoki mijoz..."
        emptyState={
          <div className="py-8 text-center">
            <ShoppingCart className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Buyurtma yo`q</p>
          </div>
        }
      />
    </div>
  );
}
