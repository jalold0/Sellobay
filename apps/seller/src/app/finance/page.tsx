'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  KpiCard,
  PageHeader,
  Separator,
  StatusBadge,
  toast,
  type StatusTone,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { Banknote, Receipt, Wallet } from 'lucide-react';
import * as React from 'react';

import { getSellerStats, type SellerStats } from '../../lib/auth/client';
import { formatDate, formatMoney } from '../../lib/format';

type Payout = SellerStats['finance']['payouts'][number];

// PaymentStatus enum'i (baza) — payout uchun amalda uchraydiganlari.
const STATUS_CFG: Record<string, { label: string; tone: StatusTone }> = {
  PENDING: { label: 'Kutilmoqda', tone: 'warning' },
  PAID: { label: 'To`langan', tone: 'success' },
  FAILED: { label: 'Xato', tone: 'danger' },
  CANCELLED: { label: 'Bekor qilingan', tone: 'muted' },
  REFUNDED: { label: 'Qaytarilgan', tone: 'muted' },
};

const columns: ColumnDef<Payout>[] = [
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
    accessorKey: 'amount',
    header: () => <div className="text-right">Summa</div>,
    cell: ({ row }) => (
      <div className="text-right font-semibold">{formatMoney(row.original.amount)}</div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const cfg = STATUS_CFG[row.original.status] ?? { label: row.original.status, tone: 'muted' };
      return <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>;
    },
  },
  {
    accessorKey: 'paidAt',
    header: 'To`langan sana',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.paidAt ? formatDate(row.original.paidAt) : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'reference',
    header: 'Referens',
    cell: ({ row }) => (
      <span className="text-muted-foreground font-mono text-xs">
        {row.original.reference ?? '—'}
      </span>
    ),
  },
];

export default function SellerFinancePage() {
  const [stats, setStats] = React.useState<SellerStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    void getSellerStats().then((res) => {
      if (!alive) return;
      if (res.success) setStats(res.data);
      else toast({ title: res.error.message, variant: 'destructive' });
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="text-muted-foreground py-20 text-center text-sm">Yuklanmoqda...</div>;
  }
  if (!stats) {
    return (
      <div className="text-muted-foreground py-20 text-center text-sm">
        Ma`lumotni yuklab bo`lmadi
      </div>
    );
  }

  const { finance, kpi } = stats;
  const payouts = finance.payouts;
  const paid = payouts.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const pending = payouts.find((p) => p.status === 'PENDING');

  return (
    <div className="space-y-6">
      {/*
        "Yillik hisobot" tugmasi olib tashlandi — u onClick'siz edi va hisobot
        yaratadigan kod yo'q.
      */}
      <PageHeader title="Moliya" description="To`lovlar va komissiya" />

      {pending ? (
        <Alert variant="info">
          <Wallet className="h-4 w-4" />
          <AlertTitle>Kutilayotgan to`lov: {formatMoney(pending.amount)}</AlertTitle>
          <AlertDescription>
            Davr: {formatDate(pending.periodStart)} — {formatDate(pending.periodEnd)}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Davr daromadi (${kpi.windowDays}k)`}
          value={formatMoney(finance.periodGross)}
          icon={Banknote}
          accent="success"
        />
        <KpiCard
          label="Komissiyadan keyin"
          value={formatMoney(finance.periodNet)}
          icon={Receipt}
          accent="primary"
        />
        <KpiCard label="To`langan (jami)" value={formatMoney(paid)} icon={Receipt} accent="info" />
        <KpiCard
          label="Kutilmoqda"
          value={formatMoney(pending?.amount ?? 0)}
          icon={Wallet}
          accent="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Komissiya</CardTitle>
          <p className="text-muted-foreground text-xs">
            Sizning shartnomangizdagi stavka (Seller.commissionRate)
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3 md:divide-x">
          {/*
            Ilgari bu yerda "Asosiy komissiya 10%" qotib yozilgan edi — har bir
            sotuvchining stavkasi shartnomaga qarab har xil bo'lishi mumkin.
            Endi bazadagi haqiqiy qiymat ko'rsatiladi. "Yetkazib berish 20 000"
            va "Saqlash 0" olib tashlandi: bunday to'lovlar bazada yo'q.
          */}
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Komissiya stavkasi</div>
            <div className="text-2xl font-bold">{finance.commissionRate}%</div>
            <p className="text-muted-foreground text-xs">Har bir buyurtmadan</p>
          </div>
          <div className="space-y-1 md:pl-4">
            <div className="text-muted-foreground text-xs">Davr komissiyasi</div>
            <div className="text-2xl font-bold">{formatMoney(finance.periodCommission)}</div>
            <p className="text-muted-foreground text-xs">Oxirgi {kpi.windowDays} kun</p>
          </div>
          <div className="space-y-1 md:pl-4">
            <div className="text-muted-foreground text-xs">Buyurtmalar</div>
            <div className="text-2xl font-bold">{kpi.ordersCount}</div>
            <p className="text-muted-foreground text-xs">Oxirgi {kpi.windowDays} kun</p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card className="p-1">
        {payouts.length === 0 ? (
          <div className="text-muted-foreground p-10 text-center text-sm">
            Hozircha to`lov tarixi yo`q.
          </div>
        ) : (
          <DataTable columns={columns} data={payouts} searchPlaceholder="Davr yoki summa..." />
        )}
      </Card>
    </div>
  );
}
