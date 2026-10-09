'use client';

// Qaytarishlar — kuryerga topshiriq ochish.
//
// Mijoz qaytarishni so'raganda buyurtma `RETURNED` bo'ladi, lekin
// mahsulot hali MIJOZDA turadi. Shu paytgacha uni qaytarib olib
// keladigan hech kim yo'q edi: `Delivery` jadvalida faqat chiquvchi
// yetkazish bor edi va kuryer ilovasida qaytarish topshirig'i umuman
// ko'rinmasdi.
//
// Topshiriq avtomatik ochilmaydi — asossiz so'rov ham kuryerni yo'lga
// chiqarardi. Tasdiqlash aynan shu tugma.

import { Button, Card, CardContent, EmptyState, PageHeader, Skeleton, toast } from '@ecom/ui';
import { PackageCheck, Phone, Truck } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { dispatchReturn, listPendingReturns, type PendingReturnItem } from '@/lib/auth/client';
import { formatDateTime, formatMoney } from '../../../lib/format';

function pickName(text: PendingReturnItem['items'][number]['nameSnapshot']): string {
  return text.uz ?? text.ru ?? text.en ?? '—';
}

export default function ReturnsPage() {
  const [items, setItems] = React.useState<PendingReturnItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listPendingReturns();
    if (res.success) setItems(res.data.items);
    else toast({ title: res.error.message, variant: 'destructive' });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const dispatch = async (it: PendingReturnItem) => {
    setBusyId(it.id);
    const res = await dispatchReturn(it.id);
    setBusyId(null);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: `${it.number} — kuryerga topshiriq ochildi`,
      description:
        res.data.created > 1
          ? `${res.data.created} ta topshiriq: mahsulotlar har xil omborga qaytariladi`
          : 'Kuryer ilovasida «Bo`sh topshiriqlar» ro`yxatida ko`rinadi',
      variant: 'success',
    });
    // Serverdan qayta o'qiymiz: boshqa admin ulgurgan bo'lishi mumkin.
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Qaytarishlar"
        description="Mijoz qaytarishni so`radi — mahsulotni olib kelish uchun kuryerga topshiriq oching"
      />

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={PackageCheck}
              title="Kutayotgan qaytarish yo`q"
              description="Mijoz qaytarish so`raganda buyurtma shu yerda paydo bo`ladi"
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Card key={it.id}>
              <CardContent className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-3">
                    <Link href={`/orders/${it.id}`} className="font-semibold hover:underline">
                      {it.number}
                    </Link>
                    <span className="text-muted-foreground text-sm">
                      {formatMoney(Number(it.grandTotal))}
                    </span>
                  </div>

                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    {it.recipientName ? <span>{it.recipientName}</span> : null}
                    {it.recipientPhone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone size={13} />
                        {it.recipientPhone}
                      </span>
                    ) : null}
                    <span>{formatDateTime(it.returnedAt)}</span>
                  </div>

                  <ul className="text-muted-foreground mt-1 text-sm">
                    {it.items.map((line) => (
                      <li key={line.id}>
                        {line.quantity}× {pickName(line.nameSnapshot)}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => void dispatch(it)}
                  disabled={busyId === it.id}
                  className="shrink-0"
                >
                  <Truck size={15} className="mr-2" />
                  Kuryerga topshiriq ochish
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
