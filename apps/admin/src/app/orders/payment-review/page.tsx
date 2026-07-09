'use client';

import { Button, Card, CardContent, EmptyState, PageHeader, Skeleton, toast } from '@ecom/ui';
import { Check, MapPin, Phone, ReceiptText, X, ZoomIn } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { listPaymentReview, reviewPayment, type PaymentReviewItem } from '@/lib/auth/client';
import { formatDateTime, formatMoney } from '../../../lib/format';

export default function PaymentReviewPage() {
  const [items, setItems] = React.useState<PaymentReviewItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listPaymentReview();
    if (res.success) setItems(res.data.items);
    else toast({ title: res.error.message, variant: 'destructive' });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const act = async (it: PaymentReviewItem, action: 'verify' | 'reject') => {
    let comment: string | undefined;
    if (action === 'reject') {
      const reason = window.prompt(`«${it.orderNumber}» to'lovini rad etish sababi (ixtiyoriy):`);
      if (reason === null) return; // bekor qilindi
      comment = reason.trim() || undefined;
    }
    setBusyId(it.paymentId);
    const res = await reviewPayment(it.orderId, action, comment);
    setBusyId(null);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({
      title:
        action === 'verify'
          ? `${it.orderNumber} — to'lov tasdiqlandi`
          : `${it.orderNumber} — to'lov rad etildi`,
      description:
        action === 'verify'
          ? 'Buyurtma PAID holatiga o`tdi, fulfillment davom etadi'
          : 'Mijoz chekni qayta yuklashi mumkin',
      variant: action === 'verify' ? 'success' : 'destructive',
    });
    // Ro'yxatni serverdan qayta yuklaymiz — mijoz chekni qayta yuklagan yoki boshqa admin
    // amal qilgan bo'lsa, lokal holat eskirmaydi (rad etilgan chekni "yo'q" deb ko'rsatib qo'ymaymiz).
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Karta to'lovlarini tekshirish"
        description="Karta orqali to'lagan mijozlar cheklarini ko'rib, to'lovni tasdiqlang"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Yangilash
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="Tekshiriladigan to'lov yo'q"
          description="Karta orqali to'lovni kutayotgan buyurtmalar shu yerda ko'rinadi"
        />
      ) : (
        <div className="grid gap-3">
          {items.map((it) => {
            const busy = busyId === it.paymentId;
            return (
              <Card key={it.paymentId}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
                  {/* Chek rasmi */}
                  <button
                    type="button"
                    onClick={() => setZoom(it.receipt)}
                    className="bg-muted group relative h-32 w-32 shrink-0 overflow-hidden rounded-lg border"
                    title="Kattalashtirish"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={it.receipt} alt="chek" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                      <ZoomIn size={22} />
                    </span>
                  </button>

                  {/* Ma'lumot */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Link
                        href={`/orders/${it.orderId}`}
                        className="font-semibold hover:underline"
                      >
                        {it.orderNumber}
                      </Link>
                      <span className="text-brand-ink text-lg font-bold">
                        {formatMoney(it.amount)}
                      </span>
                    </div>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-3 text-xs">
                      <span>{it.customerName}</span>
                      {it.customerPhone ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={12} /> {it.customerPhone}
                        </span>
                      ) : null}
                      {it.city ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} /> {it.city}
                        </span>
                      ) : null}
                      <span>{it.itemCount} mahsulot</span>
                      <span>{formatDateTime(new Date(it.placedAt))}</span>
                    </div>
                    {it.note ? (
                      <div className="bg-muted mt-2 rounded-md px-2.5 py-1.5 text-xs">
                        <span className="text-muted-foreground">Mijoz izohi: </span>
                        {it.note}
                      </div>
                    ) : null}
                  </div>

                  {/* Amallar */}
                  <div className="flex gap-2 sm:flex-col sm:justify-center">
                    <Button
                      size="sm"
                      onClick={() => void act(it, 'verify')}
                      disabled={busy}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Check size={14} className="mr-1" />
                      {busy ? '...' : 'Tasdiqlash'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void act(it, 'reject')}
                      disabled={busy}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <X size={14} className="mr-1" /> Rad etish
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Chekni kattalashtirib ko'rish (lightbox) */}
      {zoom ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={() => setZoom(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoom}
            alt="chek"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        </div>
      ) : null}
    </div>
  );
}
