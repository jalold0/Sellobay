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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  PageHeader,
  Separator,
  Skeleton,
  toast,
} from '@ecom/ui';
import {
  ArrowLeft,
  Check,
  CircleDot,
  CreditCard,
  Loader2,
  MapPin,
  Phone,
  ReceiptText,
  Truck,
  UserRound,
  X,
  ZoomIn,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';

import { Breadcrumbs } from '../../../components/layout/breadcrumbs';
import { CarrierCard } from '../../../components/orders/carrier-card';
import { CustodyCard } from '../../../components/orders/custody-card';
import { RefundPanel } from '../../../components/payments/refund-panel';
import { VerifyPaymentForm } from '../../../components/payments/verify-payment-form';
import {
  ORDER_STATUS_LABELS,
  OrderStatusBadge,
} from '../../../components/status/order-status-badge';
import { PaymentStatusBadge } from '../../../components/status/payment-status-badge';
import {
  cancelOrder,
  getOrderDetail,
  reviewPayment,
  updateOrderStatus,
  type AdminOrderDetail,
  type AdminOrderStatus,
} from '@/lib/auth/client';
import { formatDateTime, formatMoney, formatRelative, pickLocalized } from '../../../lib/format';

/** Sotuvchi jo'natmasi holati (ADR 0015). */
const SHIPMENT_STATUS_LABEL: Record<AdminOrderDetail['shipments'][number]['status'], string> = {
  NEW: 'Sotuvchida',
  ACCEPTED: 'Sotuvchi qadoqlamoqda',
  PACKED: 'Omborga kelmoqda',
  HANDED_OVER: 'Omborda',
  CANCELLED: 'Bekor',
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';

  const [order, setOrder] = React.useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [notFound, setNotFound] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [zoom, setZoom] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await getOrderDetail(id);
    if (res.success) setOrder(res.data);
    else {
      setNotFound(true);
      toast({ title: res.error.message, variant: 'destructive' });
    }
    setLoading(false);
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onStatusChange = async (status: AdminOrderStatus) => {
    setBusy(true);
    const res = await updateOrderStatus(id, status);
    setBusy(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Status yangilandi',
      description: `Buyurtma → ${ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] ?? status}`,
      variant: 'success',
    });
    void load();
  };

  // Bekor qilish — zaxira, coin va promo qaytadi; to'langan bo'lsa pulni qaytarish alohida amal.
  const onCancel = async () => {
    const reason = window.prompt('Bekor qilish sababi (buyurtma tarixida saqlanadi):');
    if (reason === null) return;
    if (reason.trim().length < 3) {
      toast({ title: 'Sababni yozing', variant: 'destructive' });
      return;
    }
    setBusy(true);
    const res = await cancelOrder(id, reason.trim());
    setBusy(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: 'Buyurtma bekor qilindi',
      description: res.data.refundRequired
        ? 'Zaxira qaytdi. Buyurtma to‘langan — pulni mijozga qaytarishni unutmang.'
        : 'Zaxira, coin va promokod qaytarildi.',
      variant: res.data.refundRequired ? 'destructive' : 'success',
    });
    void load();
  };

  const onPayment = async (action: 'verify' | 'reject', receivedAmount?: string) => {
    let comment: string | undefined;
    if (action === 'reject') {
      const reason = window.prompt("To'lovni rad etish sababi (ixtiyoriy):");
      if (reason === null) return;
      comment = reason.trim() || undefined;
    }
    setBusy(true);
    const res = await reviewPayment(id, action, { comment, receivedAmount });
    setBusy(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: action === 'verify' ? "To'lov tasdiqlandi" : "To'lov rad etildi",
      variant: action === 'verify' ? 'success' : 'destructive',
    });
    void load();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/orders">
            <ArrowLeft className="mr-2 h-4 w-4" /> Ro`yxat
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Buyurtma topilmadi</AlertTitle>
          <AlertDescription>Bunday buyurtma mavjud emas yoki o`chirilgan.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Server to'lov holatini hisobga olib beradi — PATCH ham aynan shu qoidani tekshiradi.
  const nextStatuses = order.allowedNextStatuses;
  const showManualCard = order.manualCard?.pending;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs overrides={{ [`/orders/${id}`]: order.number }} />}
        title={order.number}
        description={`${formatDateTime(order.placedAt)} · ${formatRelative(order.placedAt)}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/orders">
                <ArrowLeft className="mr-2 h-4 w-4" /> Ro`yxat
              </Link>
            </Button>
            {nextStatuses.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" disabled={busy}>
                    Status o`zgartirish
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Keyingi holat</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {nextStatuses.map((k) => (
                    <DropdownMenuItem key={k} onClick={() => void onStatusChange(k)}>
                      {ORDER_STATUS_LABELS[k as keyof typeof ORDER_STATUS_LABELS] ?? k}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {order.canCancel ? (
              <Button
                size="sm"
                variant="destructive"
                disabled={busy}
                onClick={() => void onCancel()}
              >
                Bekor qilish
              </Button>
            ) : null}
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.paymentStatus} />
        <span className="text-muted-foreground text-xs">{order.paymentProvider}</span>
      </div>

      {/* Karta orqali to'lov — tasdiqlash kutilmoqda */}
      {showManualCard ? (
        <Alert variant="warning">
          <ReceiptText className="h-4 w-4" />
          <AlertTitle>Karta to`lovi tasdiqlashni kutmoqda</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start">
              <button
                type="button"
                onClick={() => setZoom(true)}
                className="bg-muted group relative h-28 w-28 shrink-0 overflow-hidden rounded-lg border"
                title="Kattalashtirish"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={order.manualCard!.receipt}
                  alt="chek"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                  <ZoomIn size={20} />
                </span>
              </button>
              <div className="flex-1">
                {order.manualCard!.note ? (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Mijoz izohi: </span>
                    {order.manualCard!.note}
                  </p>
                ) : null}
                <div className="mt-2">
                  <VerifyPaymentForm
                    inputId={`received-${order.id}`}
                    expected={order.grandTotal}
                    busy={busy}
                    onVerify={(amount) => void onPayment('verify', amount)}
                    onReject={() => void onPayment('reject')}
                  />
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      ) : order.status === 'PENDING' ? (
        <Alert variant="warning">
          <Loader2 className="h-4 w-4" />
          <AlertTitle>Tasdiqlash kutilmoqda</AlertTitle>
          <AlertDescription>Mijoz to`lovni amalga oshirmagan yoki tasdiqlanmagan.</AlertDescription>
        </Alert>
      ) : null}

      {/* Bekor qilingan/qaytarilgan to'langan buyurtma — pul qaytarilishi kerak (K5) */}
      {order.refund.remaining !== '0.00' ? (
        <RefundPanel
          key={order.refund.refundedTotal}
          orderId={order.id}
          remaining={order.refund.remaining}
          refundedTotal={order.refund.refundedTotal}
          provider={order.paymentProvider}
          onDone={() => void load()}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Mahsulotlar ({order.items.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {order.items.map((it) => (
                  <li key={it.id} className="flex items-center gap-3 p-4">
                    <div className="bg-muted h-14 w-14 shrink-0 overflow-hidden rounded-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{pickLocalized(it.productName)}</div>
                      <div className="text-muted-foreground text-xs">{it.sku}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div>
                        {it.quantity} × {formatMoney(it.unitPrice)}
                      </div>
                      <div className="font-semibold">{formatMoney(it.totalPrice)}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <Separator />
              <div className="space-y-2 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatMoney(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Yetkazib berish</span>
                  <span>{formatMoney(order.shippingTotal)}</span>
                </div>
                {order.discountTotal > 0 ? (
                  <div className="flex justify-between text-emerald-700">
                    <span>Chegirma</span>
                    <span>-{formatMoney(order.discountTotal)}</span>
                  </div>
                ) : null}
                <Separator />
                <div className="flex justify-between text-base font-bold">
                  <span>Jami</span>
                  <span>{formatMoney(order.grandTotal)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tarix</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative space-y-4 border-l pl-6">
                {order.statusHistory.map((h, i) => {
                  const Icon =
                    h.status === 'DELIVERED' ? Check : h.status === 'CANCELLED' ? X : CircleDot;
                  return (
                    <li key={i} className="relative">
                      <span className="bg-background absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full border">
                        <Icon className="h-3 w-3" />
                      </span>
                      <div className="flex items-center gap-2">
                        <OrderStatusBadge status={h.status} />
                        <span className="text-muted-foreground text-xs">
                          {formatDateTime(h.changedAt)}
                        </span>
                      </div>
                      {h.comment ? (
                        <p className="text-muted-foreground mt-1 text-sm">{h.comment}</p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>

          {order.notes ? (
            <Card>
              <CardHeader>
                <CardTitle>Mijoz izohi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{order.notes}</p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <UserRound className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-sm">Mijoz</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <div className="font-medium">{order.customerName}</div>
              <div className="text-muted-foreground mt-2 flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" /> {order.customerPhone || '—'}
              </div>
            </CardContent>
          </Card>

          {order.shippingAddress ? (
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 space-y-0">
                <MapPin className="text-muted-foreground h-4 w-4" />
                <CardTitle className="text-sm">Yetkazib berish manzili</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="font-medium">{order.shippingAddress.recipientName}</div>
                <div className="text-muted-foreground">{order.shippingAddress.phone}</div>
                <Separator className="my-2" />
                <div>{order.shippingAddress.region}</div>
                <div>
                  {order.shippingAddress.city}, {order.shippingAddress.street}
                </div>
                {order.shippingAddress.landmark ? (
                  <div className="text-muted-foreground text-xs">
                    Mo`ljal: {order.shippingAddress.landmark}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <CarrierCard
            orderId={order.id}
            carrier={order.carrier}
            events={order.carrierEvents}
            onChanged={() => void load()}
          />

          {order.custody ? <CustodyCard custody={order.custody} /> : null}

          {order.shipments.length > 0 ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-sm">Omborga yig‘ish</CardTitle>
                <Link href="/inbound" className="text-muted-foreground text-xs hover:underline">
                  Ombor qabuli
                </Link>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.shipments.map((s) => (
                  <div key={s.id} className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate">{s.sellerName ?? 'Sellobay ombori'}</div>
                      <div className="text-muted-foreground text-xs">
                        {s.model}, {s.itemCount} ta tovar
                      </div>
                    </div>
                    <span
                      className={
                        s.status === 'HANDED_OVER'
                          ? 'shrink-0 text-xs text-emerald-700'
                          : s.status === 'CANCELLED'
                            ? 'text-muted-foreground shrink-0 text-xs'
                            : 'shrink-0 text-xs text-amber-700'
                      }
                    >
                      {SHIPMENT_STATUS_LABEL[s.status]}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Truck className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-sm">Yetkazib berish usuli</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div>
                {order.deliveryMethod === 'HOME_DELIVERY'
                  ? 'Uyga yetkazib berish'
                  : order.deliveryMethod === 'PICKUP_POINT'
                    ? 'Olib ketish punkti'
                    : 'Express yetkazib berish'}
              </div>
              <div className="text-muted-foreground text-xs">{order.city}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <CreditCard className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-sm">To`lov</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Provider</span>
                <span>{order.paymentProvider}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <PaymentStatusBadge status={order.paymentStatus} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Summa</span>
                <span className="font-semibold">{formatMoney(order.grandTotal)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {zoom && order.manualCard ? (
        <button
          type="button"
          aria-label="Chekni yopish"
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={() => setZoom(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={order.manualCard.receipt}
            alt="chek"
            className="max-h-[90vh] max-w-full rounded-lg object-contain"
          />
        </button>
      ) : null}
    </div>
  );
}
