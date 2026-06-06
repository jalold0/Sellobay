'use client';

import {
  Button,
  Card,
  DataTable,
  KpiCard,
  PageHeader,
  StatusBadge,
  type StatusTone,
  toast,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { Check, RotateCcw, X } from 'lucide-react';

import { formatDate, formatMoney, formatNumber, pickLocalized } from '../../lib/format';
import { sellerReturns, type SellerReturn } from '../../lib/mock';

const STATUS_CFG: Record<SellerReturn['status'], { label: string; tone: StatusTone }> = {
  REQUESTED: { label: "So`rov", tone: 'warning' },
  APPROVED: { label: 'Tasdiqlangan', tone: 'info' },
  REJECTED: { label: 'Rad etilgan', tone: 'danger' },
  COMPLETED: { label: 'Yakunlangan', tone: 'success' },
};

const columns: ColumnDef<SellerReturn>[] = [
  {
    accessorKey: 'orderNumber',
    header: 'Buyurtma',
    cell: ({ row }) => <span className="font-mono font-medium">{row.original.orderNumber}</span>,
  },
  {
    accessorKey: 'customerName',
    header: 'Mijoz',
    cell: ({ row }) => (
      <div className="text-sm">
        <div>{row.original.customerName}</div>
        <div className="truncate text-xs text-muted-foreground">{pickLocalized(row.original.productName)}</div>
      </div>
    ),
  },
  {
    accessorKey: 'reason',
    header: 'Sabab',
    cell: ({ row }) => <span className="text-sm">{row.original.reason}</span>,
  },
  {
    accessorKey: 'refundAmount',
    header: () => <div className="text-right">Qaytarish summasi</div>,
    cell: ({ row }) => <div className="text-right font-semibold">{formatMoney(row.original.refundAmount)}</div>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const cfg = STATUS_CFG[row.original.status];
      return <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>;
    },
  },
  {
    accessorKey: 'requestedAt',
    header: 'Sana',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">{formatDate(row.original.requestedAt)}</span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      if (row.original.status !== 'REQUESTED') return null;
      return (
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={() => toast({ title: 'Tasdiqlandi', variant: 'success' })}
          >
            <Check className="mr-1 h-3 w-3" /> Tasdiqlash
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 border-red-200 text-red-700 hover:bg-red-50"
            onClick={() => toast({ title: 'Rad etildi', variant: 'destructive' })}
          >
            <X className="mr-1 h-3 w-3" /> Rad
          </Button>
        </div>
      );
    },
  },
];

export default function SellerReturnsPage() {
  const totalRefund = sellerReturns.reduce((s, r) => s + r.refundAmount, 0);
  const pending = sellerReturns.filter((r) => r.status === 'REQUESTED').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Qaytarishlar" description="Mijoz qaytarish so`rovlari va status" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Jami so`rovlar" value={formatNumber(sellerReturns.length)} icon={RotateCcw} accent="primary" />
        <KpiCard label="Yangi so`rov" value={formatNumber(pending)} accent="warning" />
        <KpiCard label="Tasdiqlangan" value={formatNumber(sellerReturns.filter((r) => r.status === 'APPROVED' || r.status === 'COMPLETED').length)} accent="success" />
        <KpiCard label="Jami qaytarilgan" value={formatMoney(totalRefund)} accent="info" />
      </div>

      <Card className="p-1">
        <DataTable columns={columns} data={sellerReturns} searchPlaceholder="Buyurtma raqami yoki mijoz..." />
      </Card>
    </div>
  );
}
