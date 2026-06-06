'use client';

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
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  DollarSign,
  ShoppingCart,
  Users,
} from 'lucide-react';
import Link from 'next/link';

import { ChannelPie } from '../components/charts/channel-pie';
import { OrdersChart } from '../components/charts/orders-chart';
import { RevenueChart } from '../components/charts/revenue-chart';
import { OrderStatusBadge } from '../components/status/order-status-badge';
import { formatDate, formatMoney, formatNumber, initials, pickLocalized } from '../lib/format';
import {
  mockChannelBreakdown,
  mockCustomers,
  mockOrders,
  mockProducts,
  mockRevenueSeries,
} from '../lib/mock';

export default function DashboardPage() {
  const revenue30 = mockRevenueSeries.reduce((s, p) => s + p.revenue, 0);
  const revenuePrev = revenue30 * 0.88;
  const revenueDelta = ((revenue30 - revenuePrev) / revenuePrev) * 100;

  const ordersTotal = mockOrders.length;
  const newCustomers = mockCustomers.filter(
    (c) => Date.now() - new Date(c.registeredAt).getTime() < 30 * 86_400_000,
  ).length;
  const avgCheck = revenue30 / Math.max(ordersTotal, 1);

  const lowStock = mockProducts
    .filter((p) => p.stock <= 10 && p.status === 'ACTIVE')
    .slice(0, 5);

  const recentOrders = [...mockOrders]
    .sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt))
    .slice(0, 6);

  const topProducts = [...mockProducts]
    .sort((a, b) => b.soldCount - a.soldCount)
    .slice(0, 5);

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
        <KpiCard
          label="Oxirgi 30 kun daromad"
          value={formatMoney(revenue30)}
          delta={revenueDelta}
          icon={DollarSign}
          accent="success"
          hint="oldingi davrga nisbatan"
        />
        <KpiCard
          label="Buyurtmalar"
          value={formatNumber(ordersTotal)}
          delta={6.2}
          icon={ShoppingCart}
          accent="info"
        />
        <KpiCard
          label="Yangi mijozlar"
          value={formatNumber(newCustomers)}
          delta={-2.1}
          icon={Users}
          accent="warning"
          hint="oxirgi 30 kun"
        />
        <KpiCard
          label="O`rtacha chek"
          value={formatMoney(avgCheck)}
          delta={3.4}
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
              <p className="text-xs text-muted-foreground">Oxirgi 30 kun, kunlik UZS</p>
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
            <RevenueChart data={mockRevenueSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Kanal taqsimoti</CardTitle>
            <p className="text-xs text-muted-foreground">Bu oyga ko`ra savdo manbalari</p>
          </CardHeader>
          <CardContent>
            <ChannelPie data={mockChannelBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* Recent + low stock */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle>So`nggi buyurtmalar</CardTitle>
              <p className="text-xs text-muted-foreground">Eng yangi 6 ta</p>
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
                  className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-muted/40"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[10px]">{initials(o.customerName)}</AvatarFallback>
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
                    <div className="truncate text-xs text-muted-foreground">
                      {o.customerName} · {o.itemsCount} ta mahsulot
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatMoney(o.grandTotal)}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(o.placedAt)}</div>
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
            <p className="text-xs text-muted-foreground">10 dan kam qoldi</p>
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
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{pickLocalized(p.name)}</div>
                      <div className="truncate text-xs text-muted-foreground">{p.sku}</div>
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
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{pickLocalized(p.name)}</div>
                    <div className="text-xs text-muted-foreground">{p.brandName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatNumber(p.soldCount)}</div>
                    <div className="text-xs text-muted-foreground">sotilgan</div>
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
            <OrdersChart data={mockRevenueSeries} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
