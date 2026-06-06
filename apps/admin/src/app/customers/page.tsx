'use client';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  DataTable,
  EmptyState,
  KpiCard,
  PageHeader,
  StatusBadge,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowDownToLine, Crown, Users } from 'lucide-react';
import Link from 'next/link';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { formatDate, formatMoney, formatNumber, initials } from '../../lib/format';
import { mockCustomers, type Customer } from '../../lib/mock';

const STATUS_LABEL: Record<Customer['status'], { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  ACTIVE: { label: 'Faol', tone: 'success' },
  PENDING: { label: 'Tasdiqlanmagan', tone: 'warning' },
  BLOCKED: { label: 'Bloklangan', tone: 'danger' },
};

const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: 'firstName',
    header: 'Mijoz',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={row.original.avatarUrl} alt="" />
          <AvatarFallback className="text-[10px]">
            {initials(`${row.original.firstName} ${row.original.lastName}`)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <Link
            href={`/customers/${row.original.id}`}
            className="block truncate font-medium hover:underline"
          >
            {row.original.firstName} {row.original.lastName}
          </Link>
          <div className="truncate text-xs text-muted-foreground">
            {row.original.email ?? row.original.phone}
          </div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'phone',
    header: 'Aloqa',
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-mono">{row.original.phone}</div>
        <div className="text-xs text-muted-foreground">{row.original.city ?? '—'}</div>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const cfg = STATUS_LABEL[row.original.status];
      return <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>;
    },
  },
  {
    accessorKey: 'ordersCount',
    header: () => <div className="text-right">Buyurtmalar</div>,
    cell: ({ row }) => <div className="text-right">{formatNumber(row.original.ordersCount)}</div>,
  },
  {
    accessorKey: 'totalSpent',
    header: () => <div className="text-right">Jami sarflagan</div>,
    cell: ({ row }) => (
      <div className="text-right font-semibold">{formatMoney(row.original.totalSpent)}</div>
    ),
  },
  {
    accessorKey: 'loyaltyPoints',
    header: () => <div className="text-right">Ballar</div>,
    cell: ({ row }) => <div className="text-right">{formatNumber(row.original.loyaltyPoints)}</div>,
  },
  {
    accessorKey: 'registeredAt',
    header: "Ro`yxatdan",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{formatDate(row.original.registeredAt)}</span>
    ),
  },
];

export default function AdminCustomersPage() {
  const totalCustomers = mockCustomers.length;
  const activeCustomers = mockCustomers.filter((c) => c.status === 'ACTIVE').length;
  const totalSpent = mockCustomers.reduce((s, c) => s + c.totalSpent, 0);
  const vip = mockCustomers.filter((c) => c.totalSpent > 5_000_000).length;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Mijozlar"
        description="CRM bazasi va segmentatsiya"
        actions={
          <Button variant="outline" size="sm">
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Eksport
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Jami mijozlar" value={formatNumber(totalCustomers)} icon={Users} accent="primary" />
        <KpiCard
          label="Faol"
          value={formatNumber(activeCustomers)}
          accent="success"
          hint={`${((activeCustomers / totalCustomers) * 100).toFixed(0)}%`}
        />
        <KpiCard label="Jami daromad" value={formatMoney(totalSpent)} accent="info" />
        <KpiCard label="VIP mijozlar" value={formatNumber(vip)} icon={Crown} accent="warning" />
      </div>

      <Card className="p-1">
        <DataTable
          columns={columns}
          data={mockCustomers}
          searchPlaceholder="Ism, email yoki telefon..."
          emptyState={<EmptyState icon={Users} title="Mijoz topilmadi" />}
        />
      </Card>
    </div>
  );
}
