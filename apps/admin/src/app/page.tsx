'use client';

// Admin bosh sahifasi.
//
// Ilgari bu sahifa `lib/mock` dan o'qirdi va sarlavhasida "real-time KPI"
// deb turardi: daromad, buyurtma, mijoz — hammasi o'ylab topilgan edi, o'sish
// foizi esa `revenue30 * 0.88` bilan hisoblanardi, ya'ni har doim bir xil
// chiqardi. Endi barcha raqam /api/dashboard orqali bazadan keladi.
//
// Ko'rsatkich yo'q bo'lsa NOL ko'rsatiladi, taxminiy raqam emas: bosh sahifa
// loyihaning haqiqiy holatini ko'rsatishi kerak.

import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  KpiCard,
  PageHeader,
  Skeleton,
  toast,
} from '@ecom/ui';
import { AlertTriangle, ArrowRight, Boxes, DollarSign, ShoppingCart, Users } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { OrdersChart } from '../components/charts/orders-chart';
import { RevenueChart } from '../components/charts/revenue-chart';
import { OrderStatusBadge } from '../components/status/order-status-badge';
import { fetchDashboard, type DashboardData } from '@/lib/auth/client';
import { formatDate, formatMoney, formatNumber, initials, pickLocalized } from '../lib/format';

/** Yetkazish usullarining o'qiladigan nomi. */
const DELIVERY_LABEL: Record<string, string> = {
  HOME_DELIVERY: 'Uyga yetkazish',
  PICKUP_POINT: 'Topshirish punkti',
  EXPRESS: 'Ekspress',
};

export default function DashboardPage() {
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetchDashboard();
      if (cancelled) return;
      if (res.success) setData(res.data);
      else toast({ title: res.error.message, variant: 'destructive' });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const windowDays = data?.windowDays ?? 30;
  // Oldingi davr nolga teng bo'lsa API null qaytaradi — bunda foiz umuman
  // ko'rsatilmaydi (nolga nisbatan o'sishni hisoblab bo'lmaydi).
  const delta = (value: number | null | undefined) => value ?? undefined;
  const noPaidOrders = data !== null && data.orders.current === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bosh sahifa"
        description={`Bazadagi haqiqiy ma'lumot — oxirgi ${windowDays} kun`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/orders">
              Buyurtmalar <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        }
      />

      {/* KPI — har bir kartada davr ko'rsatkichi va jami qiymat */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Daromad · ${windowDays} kun`}
          value={data ? formatMoney(data.revenue.current) : '—'}
          delta={delta(data?.revenue.deltaPercent)}
          icon={DollarSign}
          accent="success"
          loading={loading}
          hint={data ? `jami: ${formatMoney(data.revenue.allTime)}` : undefined}
        />
        <KpiCard
          label={`To'langan buyurtma · ${windowDays} kun`}
          value={data ? formatNumber(data.orders.current) : '—'}
          delta={delta(data?.orders.deltaPercent)}
          icon={ShoppingCart}
          accent="info"
          loading={loading}
          hint={data ? `jami: ${formatNumber(data.orders.allTime)}` : undefined}
        />
        <KpiCard
          label={`Yangi mijoz · ${windowDays} kun`}
          value={data ? formatNumber(data.customers.current) : '—'}
          delta={delta(data?.customers.deltaPercent)}
          icon={Users}
          accent="warning"
          loading={loading}
          hint={data ? `jami: ${formatNumber(data.customers.allTime)}` : undefined}
        />
        <KpiCard
          label="O'rtacha chek"
          value={data ? formatMoney(data.averageOrderValue.current) : '—'}
          delta={delta(data?.averageOrderValue.deltaPercent)}
          icon={Boxes}
          accent="primary"
          loading={loading}
          hint={data ? `jami: ${formatMoney(data.averageOrderValue.allTime)}` : undefined}
        />
      </div>

      {noPaidOrders && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          Oxirgi {windowDays} kunda tasdiqlangan to&apos;lov qayd etilmagan. Quyidagi grafiklar shu
          sababli bo&apos;sh — bu xato emas, bazadagi holat shunday.
        </div>
      )}

      {/* Grafiklar */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Daromad dinamikasi</CardTitle>
            <p className="text-muted-foreground text-xs">
              Oxirgi {windowDays} kun, to&apos;lov sanasi bo&apos;yicha (UZS)
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <RevenueChart data={data?.dailySeries ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Yetkazish usuli</CardTitle>
            <p className="text-muted-foreground text-xs">Oxirgi {windowDays} kundagi buyurtmalar</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[160px] w-full" />
            ) : !data || data.deliveryBreakdown.length === 0 ? (
              <EmptyState title="Ma`lumot yo`q" description="Bu davrda buyurtma bo`lmagan" />
            ) : (
              <ul className="space-y-3">
                {data.deliveryBreakdown.map((row) => {
                  const total = data.deliveryBreakdown.reduce((sum, r) => sum + r.count, 0);
                  const percent = total > 0 ? Math.round((row.count / total) * 100) : 0;
                  return (
                    <li key={row.method}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>{DELIVERY_LABEL[row.method] ?? row.method}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {row.count} · {percent}%
                        </span>
                      </div>
                      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                        <div className="bg-primary h-full" style={{ width: `${percent}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* So'nggi buyurtmalar + kam qolgan zaxira */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle>So&apos;nggi buyurtmalar</CardTitle>
              <p className="text-muted-foreground text-xs">Eng yangi 6 ta</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
              <Link href="/orders">
                Barchasi <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 px-6 pb-6">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !data || data.recentOrders.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState title="Buyurtma yo`q" description="Hali birorta buyurtma tushmagan" />
              </div>
            ) : (
              <ul className="divide-y">
                {data.recentOrders.map((order) => (
                  <li
                    key={order.id}
                    className="hover:bg-muted/40 flex items-center gap-3 px-6 py-3 text-sm"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[10px]">
                        {initials(order.customerName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/orders/${order.id}`}
                          className="truncate font-medium hover:underline"
                        >
                          {order.number}
                        </Link>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        {order.customerName} · {order.itemsCount} ta mahsulot
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatMoney(order.grandTotal)}</div>
                      <div className="text-muted-foreground text-xs">
                        {formatDate(order.placedAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Kam qolgan zaxira
            </CardTitle>
            <p className="text-muted-foreground text-xs">10 dona yoki kam</p>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 px-6 pb-6">
                {[0, 1].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !data || data.lowStock.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState title="Hammasi joyida" description="Kam qolgan variant yo`q" />
              </div>
            ) : (
              <ul className="divide-y">
                {data.lowStock.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                    <div className="bg-muted h-9 w-9 shrink-0 overflow-hidden rounded">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{pickLocalized(item.name)}</div>
                      <div className="text-muted-foreground truncate text-xs">{item.sku}</div>
                    </div>
                    <Badge variant={item.stock === 0 ? 'destructive' : 'secondary'}>
                      {item.stock}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top mahsulotlar + kunlik buyurtmalar */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle>Ko&apos;p sotilgan mahsulotlar</CardTitle>
            <p className="text-muted-foreground text-xs">Butun davr bo&apos;yicha</p>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 px-6 pb-6">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !data || data.topProducts.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState title="Sotuv yo`q" description="Hali birorta mahsulot sotilmagan" />
              </div>
            ) : (
              <ul className="divide-y">
                {data.topProducts.map((product, index) => (
                  <li key={product.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                    <span className="bg-muted grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{pickLocalized(product.name)}</div>
                      <div className="text-muted-foreground text-xs">{product.brandName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatNumber(product.soldCount)}</div>
                      <div className="text-muted-foreground text-xs">sotilgan</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Kunlik buyurtmalar</CardTitle>
            <p className="text-muted-foreground text-xs">
              Oxirgi {windowDays} kun, to&apos;lov sanasi bo&apos;yicha
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <OrdersChart data={data?.dailySeries ?? []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
