'use client';

import * as React from 'react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  KpiCard,
  PageHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ecom/ui';
import { BarChart3, Percent, ShoppingBag, Users } from 'lucide-react';

import { OrdersChart } from '../../components/charts/orders-chart';
import { RevenueChart } from '../../components/charts/revenue-chart';
import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { getStats, type AdminStats } from '../../lib/auth/client';
import { formatMoney, formatNumber } from '../../lib/format';

/** Ikki davr orasidagi foiz o'zgarish; oldingi davr bo'sh bo'lsa ko'rsatilmaydi. */
function deltaPct(current: number, previous: number): number | undefined {
  if (previous <= 0) return undefined;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export default function AdminAnalyticsPage() {
  // Barcha ko'rsatkich BAZADAN (GET /api/stats). Ilgari bu sahifadagi
  // delta'lar (+12.4%, +6.2%, −0.3%, +3.5%) va "Konversiya 4.2%" kodga
  // yozib qo'yilgan sonlar edi — ular hech qachon o'zgarmasdi.
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

  const { kpi, revenueSeries, topProducts } = stats;
  const revenue30 = kpi.revenue;
  const orders30 = kpi.ordersCount;
  const aov = kpi.avgCheck;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Analitika"
        description="Daromad, buyurtmalar, mahsulot va mijoz ko`rsatkichlari"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Daromad (${kpi.windowDays}k)`}
          value={formatMoney(revenue30)}
          delta={kpi.revenueDelta ?? undefined}
          icon={BarChart3}
          accent="success"
        />
        <KpiCard
          label={`Buyurtmalar (${kpi.windowDays}k)`}
          value={formatNumber(orders30)}
          delta={deltaPct(orders30, kpi.ordersPrev)}
          icon={ShoppingBag}
          accent="info"
        />
        {/*
          "Konversiya" olib tashlandi: uni hisoblash uchun sayt tashriflari
          kerak, bazada esa tashrif kuzatuvi YO'Q edi — ko'rsatkich
          `const conv = 4.2` deb yozib qo'yilgandi. O'rniga haqiqiy son:
          davr ichida ro'yxatdan o'tgan yangi mijozlar.
        */}
        <KpiCard
          label="Yangi mijozlar"
          value={formatNumber(kpi.newCustomers)}
          icon={Users}
          accent="warning"
        />
        <KpiCard
          label="O`rtacha chek (AOV)"
          value={formatMoney(aov)}
          icon={Percent}
          accent="primary"
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Umumiy</TabsTrigger>
          <TabsTrigger value="products">Mahsulot</TabsTrigger>
          <TabsTrigger value="customers">Mijozlar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Daromad dinamikasi</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart data={revenueSeries} height={280} />
            </CardContent>
          </Card>
          {/*
            Kanal taqsimoti olib tashlandi: buyurtma qaysi manbadan kelganini
            bazada hech narsa yozmaydi, diagramma to'qima edi.
          */}
          <Card>
            <CardHeader>
              <CardTitle>Davr taqqoslash</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Joriy daromad</span>
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
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Buyurtmalar (kunlik)</CardTitle>
            </CardHeader>
            <CardContent>
              <OrdersChart data={revenueSeries} height={240} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Top mahsulotlar (sotuv)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {topProducts.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                    <span className="bg-muted grid h-7 w-7 place-items-center rounded-full text-xs font-bold">
                      {i + 1}
                    </span>
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.name.uz}</div>
                      <div className="text-muted-foreground text-xs">{p.brandName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatNumber(p.soldCount)}</div>
                      <div className="text-muted-foreground text-xs">
                        {formatMoney(p.basePrice * p.soldCount)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          {/*
            Ilgari bu yerda "+1 280", "CLV 2 350 000" va "Repeat rate 36%"
            qotib yozilgan edi. CLV (median) olib tashlandi — uni to'g'ri
            hisoblash uchun mijozning butun umri bo'yicha xarid tarixi va
            davr kesimi kerak; qolganlari bazadan olinadi.
          */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Yangi mijozlar ({kpi.windowDays}k)</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">
                {formatNumber(kpi.newCustomers)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Xaridorlar (jami)</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{formatNumber(kpi.buyers)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Takroriy xarid ulushi</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">
                {kpi.repeatRate == null ? '—' : `${kpi.repeatRate}%`}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="text-muted-foreground text-xs">
        {formatNumber(kpi.ordersCount)} ta buyurtma asosida (oxirgi {kpi.windowDays} kun).
      </div>
    </div>
  );
}
