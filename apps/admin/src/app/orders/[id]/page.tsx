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
  Printer,
  Truck,
  UserRound,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import * as React from 'react';

import { Breadcrumbs } from '../../../components/layout/breadcrumbs';
import {
  ORDER_STATUS_LABELS,
  OrderStatusBadge,
} from '../../../components/status/order-status-badge';
import { PaymentStatusBadge } from '../../../components/status/payment-status-badge';
import { formatDateTime, formatMoney, formatRelative, pickLocalized } from '../../../lib/format';
import { getOrderDetail } from '../../../lib/mock';

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const order = getOrderDetail(id);
  if (!order) return notFound();

  const onStatusChange = (status: string) => {
    toast({
      title: 'Status yangilandi',
      description: `Buyurtma → ${ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS]}`,
      variant: 'success',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={
          <Breadcrumbs
            overrides={{
              [`/orders/${id}`]: order.number,
            }}
          />
        }
        title={order.number}
        description={`${formatDateTime(order.placedAt)} · ${formatRelative(order.placedAt)}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/orders">
                <ArrowLeft className="mr-2 h-4 w-4" /> Ro`yxat
              </Link>
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="mr-2 h-4 w-4" /> Chop etish
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">Status o`zgartirish</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(ORDER_STATUS_LABELS).map(([k, l]) => (
                  <DropdownMenuItem key={k} onClick={() => onStatusChange(k)}>
                    {l}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <OrderStatusBadge status={order.status} />
        <PaymentStatusBadge status={order.paymentStatus} />
        <span className="text-muted-foreground text-xs">{order.paymentProvider}</span>
      </div>

      {order.status === 'PENDING' ? (
        <Alert variant="warning">
          <Loader2 className="h-4 w-4" />
          <AlertTitle>Tasdiqlash kutilmoqda</AlertTitle>
          <AlertDescription>
            Mijoz to`lovni amalga oshirmagan. 30 daqiqadan ortiq kutilsa avtomatik bekor qilinadi.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Items */}
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

          {/* Timeline */}
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
                <Phone className="h-3.5 w-3.5" /> {order.customerPhone}
              </div>
            </CardContent>
          </Card>

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
    </div>
  );
}
