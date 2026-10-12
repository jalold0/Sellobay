'use client';

// Pul qaytarilishi kutilayotgan buyurtmalar navbati (K5). Qayd etish buyurtma sahifasida —
// u yerda summa, usul va tranzaksiya raqami kiritiladi.

import { Button, Card, CardContent, CardHeader, CardTitle, toast } from '@ecom/ui';
import { Phone, Undo2 } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { listPendingRefunds, type PendingRefundItem } from '../../lib/auth/client';
import { formatDateTime, formatMoney } from '../../lib/format';

const REASON: Record<PendingRefundItem['status'], string> = {
  CANCELLED: 'Bekor qilingan',
  RETURNED: 'Qaytarilgan',
};

export function PendingRefunds() {
  const [items, setItems] = React.useState<PendingRefundItem[] | null>(null);

  React.useEffect(() => {
    void listPendingRefunds().then((res) => {
      if (res.success) setItems(res.data.items);
      else toast({ title: res.error.message, variant: 'destructive' });
    });
  }, []);

  // Navbat bo'sh bo'lsa bo'lim umuman ko'rinmaydi — sahifaning asosiy ishi qaytarish topshirig'i.
  if (!items || items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <Undo2 className="h-4 w-4 text-red-600" />
        <CardTitle className="text-base">Pul qaytarilishi kerak ({items.length})</CardTitle>
      </CardHeader>
      <CardContent className="divide-y p-0">
        {items.map((it) => (
          <div
            key={it.id}
            className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 text-sm">
              <div className="flex flex-wrap items-center gap-x-3">
                <Link href={`/orders/${it.id}`} className="font-semibold hover:underline">
                  {it.number}
                </Link>
                <span className="text-muted-foreground">{REASON[it.status]}</span>
                {it.provider ? <span className="text-muted-foreground">{it.provider}</span> : null}
              </div>
              <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-4 text-xs">
                {it.customerName ? <span>{it.customerName}</span> : null}
                {it.customerPhone ? (
                  <span className="inline-flex items-center gap-1">
                    <Phone size={12} /> {it.customerPhone}
                  </span>
                ) : null}
                <span>{formatDateTime(it.updatedAt)}</span>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="font-semibold text-red-600">
                {formatMoney(Number(it.remaining))}
              </span>
              <Button asChild size="sm" variant="outline">
                <Link href={`/orders/${it.id}`}>Qayd etishga o‘tish</Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
