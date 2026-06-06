'use client';

import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  KpiCard,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { Check, Pause, Store, X } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { SellerStatusBadge } from '../../components/status/seller-status-badge';
import { formatDate, formatMoney, formatNumber, initials } from '../../lib/format';
import { mockSellers, type Seller } from '../../lib/mock';

function approve(seller: Seller) {
  toast({ title: `${seller.brandName} tasdiqlandi`, variant: 'success' });
}

function reject(seller: Seller) {
  toast({ title: `${seller.brandName} rad etildi`, variant: 'destructive' });
}

const columns: ColumnDef<Seller>[] = [
  {
    accessorKey: 'brandName',
    header: 'Do`kon',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="text-[10px]">{initials(row.original.brandName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate font-medium">{row.original.brandName}</div>
          <div className="truncate text-xs text-muted-foreground">{row.original.legalName}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'ownerName',
    header: 'Egasi',
    cell: ({ row }) => (
      <div className="text-sm">
        <div>{row.original.ownerName}</div>
        <div className="text-xs text-muted-foreground">{row.original.phone}</div>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <SellerStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'commissionRate',
    header: () => <div className="text-right">Komissiya</div>,
    cell: ({ row }) => (
      <div className="text-right">{row.original.commissionRate.toFixed(1)}%</div>
    ),
  },
  {
    accessorKey: 'productsCount',
    header: () => <div className="text-right">Mahsulot</div>,
    cell: ({ row }) => <div className="text-right">{formatNumber(row.original.productsCount)}</div>,
  },
  {
    accessorKey: 'totalRevenue',
    header: () => <div className="text-right">Daromad</div>,
    cell: ({ row }) => (
      <div className="text-right font-semibold">{formatMoney(row.original.totalRevenue)}</div>
    ),
  },
  {
    accessorKey: 'appliedAt',
    header: 'Murojaat',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{formatDate(row.original.appliedAt)}</span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      if (row.original.status === 'PENDING') {
        return (
          <div className="flex justify-end gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => approve(row.original)}
            >
              <Check className="mr-1 h-3 w-3" /> Tasdiqlash
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => reject(row.original)}
            >
              <X className="mr-1 h-3 w-3" /> Rad
            </Button>
          </div>
        );
      }
      if (row.original.status === 'ACTIVE') {
        return (
          <div className="flex justify-end">
            <Button size="sm" variant="ghost" className="h-8">
              <Pause className="mr-1 h-3 w-3" /> To`xtatish
            </Button>
          </div>
        );
      }
      return null;
    },
    enableSorting: false,
  },
];

export default function AdminSellersPage() {
  const [tab, setTab] = React.useState('all');
  const filtered = React.useMemo(() => {
    if (tab === 'all') return mockSellers;
    if (tab === 'pending') return mockSellers.filter((s) => s.status === 'PENDING');
    if (tab === 'active') return mockSellers.filter((s) => s.status === 'ACTIVE');
    if (tab === 'inactive') return mockSellers.filter((s) => s.status === 'SUSPENDED' || s.status === 'BLOCKED');
    return mockSellers;
  }, [tab]);

  const pending = mockSellers.filter((s) => s.status === 'PENDING').length;
  const active = mockSellers.filter((s) => s.status === 'ACTIVE').length;
  const totalRevenue = mockSellers.reduce((s, x) => s + x.totalRevenue, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Sotuvchilar"
        description="Marketplace sotuvchilarini boshqarish"
      />

      {pending > 0 ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-amber-800 dark:text-amber-200">
              {pending} ta sotuvchi tasdiqlash kutilmoqda
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-amber-700 dark:text-amber-300">
            Tasdiqlanmagan murojaatlarni "Tekshiruvda" tabidan ko`ring.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Jami" value={formatNumber(mockSellers.length)} icon={Store} accent="primary" />
        <KpiCard label="Faol" value={formatNumber(active)} accent="success" />
        <KpiCard label="Tekshiruvda" value={formatNumber(pending)} accent="warning" />
        <KpiCard label="Umumiy aylanma" value={formatMoney(totalRevenue)} accent="info" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Barchasi ({mockSellers.length})</TabsTrigger>
          <TabsTrigger value="pending">Tekshiruvda ({pending})</TabsTrigger>
          <TabsTrigger value="active">Faol ({active})</TabsTrigger>
          <TabsTrigger value="inactive">Bloklangan/To`xtatilgan</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <Card className="p-1">
            <DataTable
              columns={columns}
              data={filtered}
              searchPlaceholder="Brend, egasi yoki STIR..."
              emptyState={<EmptyState icon={Store} title="Sotuvchi topilmadi" />}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
