'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Card,
  DataTable,
  KpiCard,
  PageHeader,
  StatusBadge,
  toast,
  type StatusTone,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { Info, RotateCcw } from 'lucide-react';
import * as React from 'react';

import { listReturns, type SellerReturnRow } from '../../lib/auth/client';
import { formatDate, formatMoney, formatNumber, pickLocalized } from '../../lib/format';

const STATUS_CFG: Record<SellerReturnRow['status'], { label: string; tone: StatusTone }> = {
  RETURNED: { label: 'Qaytarilgan · pul kutilmoqda', tone: 'warning' },
  REFUNDED: { label: 'Pul qaytarilgan', tone: 'success' },
};

const columns: ColumnDef<SellerReturnRow>[] = [
  {
    accessorKey: 'number',
    header: 'Buyurtma',
    cell: ({ row }) => <span className="font-mono font-medium">{row.original.number}</span>,
  },
  {
    accessorKey: 'customerName',
    header: 'Mijoz',
    cell: ({ row }) => (
      <div className="text-sm">
        <div>{row.original.customerName}</div>
        <div className="text-muted-foreground truncate text-xs">
          {row.original.items.map((i) => pickLocalized(i.name)).join(', ')}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'sellerAmount',
    header: () => <div className="text-right">Summa</div>,
    cell: ({ row }) => (
      <div className="text-right font-semibold">{formatMoney(row.original.sellerAmount)}</div>
    ),
  },
  {
    accessorKey: 'reason',
    header: 'Sabab',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">{row.original.reason ?? '—'}</span>
    ),
  },
  {
    accessorKey: 'returnedAt',
    header: 'Sana',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.returnedAt ? formatDate(row.original.returnedAt) : '—'}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const cfg = STATUS_CFG[row.original.status];
      return <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>;
    },
  },
];

export default function SellerReturnsPage() {
  const [rows, setRows] = React.useState<SellerReturnRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    void listReturns().then((res) => {
      if (!alive) return;
      if (res.success) setRows(res.data.items);
      else toast({ title: res.error.message, variant: 'destructive' });
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const awaitingRefund = rows.filter((r) => r.status === 'RETURNED').length;
  const totalAmount = rows.reduce((s, r) => s + r.sellerAmount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Qaytarishlar" description="Qaytarilgan buyurtmalaringiz" />

      {/*
        Ilgari bu sahifa REQUESTED → APPROVED/REJECTED oqimini ko'rsatardi va
        "Tasdiqlash"/"Rad" tugmalari bor edi. Ular faqat toast chiqarardi —
        chunki bunday bosqich bazada UMUMAN mavjud emas: qaytarishni mijoz
        boshlaydi va u darhol amalga oshadi (zaxira qaytadi, Sello Coins
        qaytadi), keyin operator pulni qaytaradi. Batafsil: docs/adr/0008.
      */}
      <Alert variant="info">
        <Info className="h-4 w-4" />
        <AlertTitle>Qaytarish qanday ishlaydi</AlertTitle>
        <AlertDescription>
          Mijoz yetkazilgandan keyin 14 kun ichida buyurtmani o`zi qaytaradi — tasdiq talab
          qilinmaydi. Tovar shu zahoti omboringizga qaytariladi. Pulni operator qaytaradi, shundan
          keyin status «Pul qaytarilgan» bo`ladi.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Jami qaytarish"
          value={formatNumber(rows.length)}
          icon={RotateCcw}
          accent="primary"
        />
        <KpiCard label="Pul kutilmoqda" value={formatNumber(awaitingRefund)} accent="warning" />
        <KpiCard label="Qaytarilgan summa" value={formatMoney(totalAmount)} accent="danger" />
      </div>

      <Card className="p-1">
        {loading ? (
          <div className="text-muted-foreground p-10 text-center text-sm">Yuklanmoqda...</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground p-10 text-center text-sm">
            Hozircha qaytarish yo`q.
          </div>
        ) : (
          <DataTable columns={columns} data={rows} searchPlaceholder="Buyurtma yoki mijoz..." />
        )}
      </Card>
    </div>
  );
}
