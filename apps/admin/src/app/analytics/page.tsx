'use client';

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

import { ChannelPie } from '../../components/charts/channel-pie';
import { OrdersChart } from '../../components/charts/orders-chart';
import { RevenueChart } from '../../components/charts/revenue-chart';
import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { formatMoney, formatNumber } from '../../lib/format';
import { mockChannelBreakdown, mockOrders, mockProducts, mockRevenueSeries } from '../../lib/mock';

export default function AdminAnalyticsPage() {
  const revenue30 = mockRevenueSeries.reduce((s, p) => s + p.revenue, 0);
  const orders30 = mockRevenueSeries.reduce((s, p) => s + (p.orders ?? 0), 0);
  const conv = 4.2;
  const aov = revenue30 / Math.max(orders30, 1);

  const topProducts = [...mockProducts].sort((a, b) => b.soldCount - a.soldCount).slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Analitika"
        description="Daromad, buyurtmalar, konversiya, mahsulot va kanal samaradorligi"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Daromad (30k)" value={formatMoney(revenue30)} delta={12.4} icon={BarChart3} accent="success" />
        <KpiCard label="Buyurtmalar (30k)" value={formatNumber(orders30)} delta={6.2} icon={ShoppingBag} accent="info" />
        <KpiCard label="Konversiya" value={`${conv}%`} delta={-0.3} icon={Percent} accent="warning" />
        <KpiCard label="O`rtacha chek (AOV)" value={formatMoney(aov)} delta={3.5} icon={Users} accent="primary" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Umumiy</TabsTrigger>
          <TabsTrigger value="products">Mahsulot</TabsTrigger>
          <TabsTrigger value="customers">Mijozlar</TabsTrigger>
          <TabsTrigger value="channels">Kanallar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Daromad dinamikasi</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart data={mockRevenueSeries} height={280} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Kanal taqsimoti</CardTitle>
            </CardHeader>
            <CardContent>
              <ChannelPie data={mockChannelBreakdown} />
            </CardContent>
          </Card>
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Buyurtmalar (kunlik)</CardTitle>
            </CardHeader>
            <CardContent>
              <OrdersChart data={mockRevenueSeries} height={240} />
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
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-xs font-bold">
                      {i + 1}
                    </span>
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.name.uz}</div>
                      <div className="text-xs text-muted-foreground">{p.brandName}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatNumber(p.soldCount)}</div>
                      <div className="text-xs text-muted-foreground">
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
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Yangi mijozlar (30k)</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">+1 280</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">CLV (median)</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">{formatMoney(2_350_000)}</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Repeat rate</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold">36%</CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="channels">
          <Card>
            <CardHeader>
              <CardTitle>Kanal samaradorligi</CardTitle>
            </CardHeader>
            <CardContent>
              <ChannelPie data={mockChannelBreakdown} height={300} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-xs text-muted-foreground">
        {formatNumber(mockOrders.length)} ta buyurtma asosida.
      </div>
    </div>
  );
}
