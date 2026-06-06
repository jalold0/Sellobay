'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  KpiCard,
  PageHeader,
  Separator,
  StatusBadge,
  type StatusTone,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { ArrowDownToLine, Banknote, FileText, Receipt, Wallet } from 'lucide-react';

import { formatDate, formatMoney, formatNumber } from '../../lib/format';
import { sellerPayouts, type SellerPayout } from '../../lib/mock';

const STATUS_CFG: Record<SellerPayout['status'], { label: string; tone: StatusTone }> = {
  PENDING: { label: 'Kutilmoqda', tone: 'warning' },
  PAID: { label: "To`langan", tone: 'success' },
  FAILED: { label: 'Xato', tone: 'danger' },
};

const columns: ColumnDef<SellerPayout>[] = [
  {
    accessorKey: 'periodStart',
    header: 'Davr',
    cell: ({ row }) => (
      <div className="text-sm">
        {formatDate(row.original.periodStart)} — {formatDate(row.original.periodEnd)}
      </div>
    ),
  },
  {
    accessorKey: 'ordersCount',
    header: () => <div className="text-right">Buyurtmalar</div>,
    cell: ({ row }) => <div className="text-right">{formatNumber(row.original.ordersCount)}</div>,
  },
  {
    accessorKey: 'grossAmount',
    header: () => <div className="text-right">Brutto</div>,
    cell: ({ row }) => <div className="text-right">{formatMoney(row.original.grossAmount)}</div>,
  },
  {
    accessorKey: 'commission',
    header: () => <div className="text-right">Komissiya</div>,
    cell: ({ row }) => (
      <div className="text-right text-red-600">-{formatMoney(row.original.commission)}</div>
    ),
  },
  {
    accessorKey: 'netAmount',
    header: () => <div className="text-right">Netto</div>,
    cell: ({ row }) => <div className="text-right font-semibold">{formatMoney(row.original.netAmount)}</div>,
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
    id: 'actions',
    header: '',
    cell: () => (
      <div className="flex justify-end">
        <Button variant="ghost" size="sm">
          <FileText className="mr-1 h-3 w-3" /> Invoice
        </Button>
      </div>
    ),
  },
];

export default function SellerFinancePage() {
  const totalNet = sellerPayouts.reduce((s, p) => s + p.netAmount, 0);
  const pending = sellerPayouts.find((p) => p.status === 'PENDING');
  const paid = sellerPayouts.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.netAmount, 0);
  const totalCommission = sellerPayouts.reduce((s, p) => s + p.commission, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moliya"
        description="Payouts, komissiya, invoice"
        actions={
          <Button variant="outline" size="sm">
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Yillik hisobot
          </Button>
        }
      />

      {pending ? (
        <Alert variant="info">
          <Wallet className="h-4 w-4" />
          <AlertTitle>Kutilayotgan payout: {formatMoney(pending.netAmount)}</AlertTitle>
          <AlertDescription>
            {formatDate(pending.periodEnd)} sanasidan keyin 3 ish kuni ichida bank hisobiga o`tkaziladi.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Umumiy daromad (netto)" value={formatMoney(totalNet)} icon={Banknote} accent="success" />
        <KpiCard label="To`langan" value={formatMoney(paid)} icon={Receipt} accent="info" />
        <KpiCard label="Kutilmoqda" value={formatMoney(pending?.netAmount ?? 0)} icon={Wallet} accent="warning" />
        <KpiCard label="Komissiya" value={formatMoney(totalCommission)} accent="danger" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Komissiya tuzilmasi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 md:divide-x">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Asosiy komissiya</div>
            <div className="text-2xl font-bold">10%</div>
            <p className="text-xs text-muted-foreground">Har bir buyurtmadan</p>
          </div>
          <div className="space-y-1 md:pl-4">
            <div className="text-xs text-muted-foreground">Yetkazib berish</div>
            <div className="text-2xl font-bold">{formatMoney(20_000)}</div>
            <p className="text-xs text-muted-foreground">Express buyurtmadan</p>
          </div>
          <div className="space-y-1 md:pl-4">
            <div className="text-xs text-muted-foreground">Saqlash</div>
            <div className="text-2xl font-bold">{formatMoney(0)}</div>
            <p className="text-xs text-muted-foreground">Hozircha bepul</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="p-1">
        <DataTable columns={columns} data={sellerPayouts} searchPlaceholder="Davr yoki summa..." />
      </Card>
    </div>
  );
}
