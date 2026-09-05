'use client';

import * as React from 'react';

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
} from '@ecom/ui';
import { AlertTriangle, ArrowRight, Boxes, DollarSign, ShoppingCart, Users } from 'lucide-react';
import Link from 'next/link';

import { OrdersChart } from '../components/charts/orders-chart';
import { RevenueChart } from '../components/charts/revenue-chart';
import { OrderStatusBadge } from '../components/status/order-status-badge';
import { formatDate, formatMoney, formatNumber, initials, pickLocalized } from '../lib/format';
import { getStats, type AdminStats } from '../lib/auth/client';

/**
 * Ikki davr orasidagi foiz o'zgarish. Oldingi davr bo'sh bo'lsa `undefined` —
 * KpiCard delta'ni umuman ko'rsatmaydi. Nolga bo'lish yoki soxta "+100%"
 * chiqarmaymiz.
 */
function deltaPct(current: number, previous: number): number | undefined {
  if (previous <= 0) return undefined;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export default function DashboardPage() {
  // Barcha ko'rsatkich BAZADAN. Ilgari bu sahifa butunlay mock ustida edi va
  // o'sish foizi `revenue30 * 0.88` dan hisoblanib, ma'lumotdan qat'i nazar
  // har doim +13.64% chiqardi.
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    void getStats().then((res) => {
      if (!alive) return;
      if (res.success) setStats(res.data);
      else setError(res.error.message);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="text-muted-foreground py-20 text-center text-sm">Yuklanmoqda...</div>;
  }
  if (error || !stats) {
    return <div className="py-20 text-center text-sm">{error ?? 'Ma`lumotni yuklab bo`lmadi'}</div>;
  }

  const { kpi, revenueSeries, lowStock, recentOrders, topProducts } = stats;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Platformaning real-time KPI ko`rsatkichlari va so`nggi faollik"
        actions={
          <>
            <Button variant="outline" size="sm">
              Eksport
            </Button>
            <Button size="sm">Yangi hisobot</Button>
          </>
        }
      />

      {/* KPI */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/*
          delta faqat HAQIQIY solishtirish bo'lganda ko'rsatiladi. Ilgari
          "Buyurtmalar +6.2%", "Yangi mijozlar −2.1%" va "O'rtacha chek +3.4%"
          kodga yozib qo'yilgan sonlar edi — ular hech qachon o'zgarmasdi.
          Oldingi davrda ma'lumot bo'lmasa delta umuman berilmaydi.
        */}
        <KpiCard
          label={`Oxirgi ${kpi.windowDays} kun daromad`}
          value={formatMoney(kpi.revenue)}
          delta={kpi.revenueDelta ?? undefined}
          icon={DollarSign}
          accent="success"
          hint="oldingi davrga nisbatan"
        />
        <KpiCard
          label="Buyurtmalar"
          value={formatNumber(kpi.ordersCount)}
          delta={deltaPct(kpi.ordersCount, kpi.ordersPrev)}
          icon={ShoppingCart}
          accent="info"
          hint={`oxirgi ${kpi.windowDays} kun`}
        />
        <KpiCard
          label="Yangi mijozlar"
          value={formatNumber(kpi.newCustomers)}
          icon={Users}
          accent="warning"
          hint={`oxirgi ${kpi.windowDays} kun`}
        />
        <KpiCard
          label="O`rtacha chek"
          value={formatMoney(kpi.avgCheck)}
          icon={Boxes}
          accent="primary"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle>Daromad dinamikasi</CardTitle>
              <p className="text-muted-foreground text-xs">Oxirgi 30 kun, kunlik UZS</p>
            </div>
            <div className="flex gap-1">
              {(['7K', '30K', '90K', '1Y'] as const).map((p, i) => (
                <Button
                  key={p}
                  size="sm"
                  variant={i === 1 ? 'default' : 'ghost'}
                  className="h-7 px-2 text-xs"
                >
                  {p}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueSeries} />
          </CardContent>
        </Card>

        {/*
          "Kanal taqsimoti" olib tashlandi: buyurtma qaysi kanaldan
          (organik/reklama/ijtimoiy tarmoq) kelganini bazada HECH NARSA
          yozmaydi — diagramma butunlay to'qima edi. Manba kuzatuvi
          qo'shilgach qaytariladi.
        */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Davr taqqoslash</CardTitle>
            <p className="text-muted-foreground text-xs">Oldingi {kpi.windowDays} kun bilan</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Joriy davr</span>
              <span className="font-semibold">{formatMoney(kpi.revenue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Oldingi davr</span>
              <span className="font-semibold">{formatMoney(kpi.revenuePrev)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-muted-foreground">Buyurtmalar</span>
              <span className="font-semibold">
                {formatNumber(kpi.ordersCount)} / {formatNumber(kpi.ordersPrev)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent + low stock */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle>So`nggi buyurtmalar</CardTitle>
              <p className="text-muted-foreground text-xs">Eng yangi 6 ta</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs">
              <Link href="/orders">
                Barchasi <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {recentOrders.map((o) => (
                <li
                  key={o.id}
                  className="hover:bg-muted/40 flex items-center gap-3 px-6 py-3 text-sm"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[10px]">
                      {initials(o.customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/orders/${o.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        {o.number}
                      </Link>
                      <OrderStatusBadge status={o.status} />
                    </div>
                    <div className="text-muted-foreground truncate text-xs">{o.customerName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatMoney(o.grandTotal)}</div>
                    <div className="text-muted-foreground text-xs">{formatDate(o.placedAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Quyi-stok ogohlantirish
            </CardTitle>
            <p className="text-muted-foreground text-xs">10 dan kam qoldi</p>
          </CardHeader>
          <CardContent className="p-0">
            {lowStock.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState title="Hammasi joyida" description="Quyi-stok mahsulot yo`q" />
              </div>
            ) : (
              <ul className="divide-y">
                {lowStock.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                    <div className="bg-muted h-9 w-9 shrink-0 overflow-hidden rounded">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{pickLocalized(p.name)}</div>
                      <div className="text-muted-foreground truncate text-xs">{p.sku}</div>
                    </div>
                    <Badge variant="destructive">{p.stock}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top products + chart */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle>Top sotuvchi mahsulotlar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {topProducts.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                  <span className="bg-muted grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{pickLocalized(p.name)}</div>
                    <div className="text-muted-foreground text-xs">{p.brandName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatNumber(p.soldCount)}</div>
                    <div className="text-muted-foreground text-xs">sotilgan</div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Kunlik buyurtmalar</CardTitle>
          </CardHeader>
          <CardContent>
            <OrdersChart data={revenueSeries} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
