'use client';

import {
  Button,
  Card,
  DataTable,
  PageHeader,
  StatusBadge,
  Switch,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { formatNumber } from '../../lib/format';
import { mockBrands, type Brand } from '../../lib/mock';

const columns: ColumnDef<Brand>[] = [
  {
    accessorKey: 'name',
    header: 'Brend',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-muted text-xs font-bold">
          {row.original.name[0]}
        </div>
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">/{row.original.slug}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'productCount',
    header: () => <div className="text-right">Mahsulot</div>,
    cell: ({ row }) => <div className="text-right">{formatNumber(row.original.productCount)}</div>,
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) =>
      row.original.isActive ? (
        <StatusBadge tone="success">Faol</StatusBadge>
      ) : (
        <StatusBadge tone="muted">Yashirin</StatusBadge>
      ),
  },
  {
    id: 'toggle',
    header: '',
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Switch defaultChecked={row.original.isActive} />
      </div>
    ),
  },
];

export default function AdminBrandsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Brendlar"
        description="Brend katalogi va ularning ko`rinishi"
        actions={
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> Yangi brend
          </Button>
        }
      />
      <Card className="p-1">
        <DataTable columns={columns} data={mockBrands} searchPlaceholder="Brend nomi..." />
      </Card>
    </div>
  );
}
