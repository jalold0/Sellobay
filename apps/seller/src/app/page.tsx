'use client';

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  KpiCard,
  PageHeader,
  StatusBadge,
} from '@ecom/ui';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Package,
  Star,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

import { RevenueChart } from '../components/charts/revenue-chart';
import { SellerOrderStatusBadge } from '../components/order-status-badge';
import { formatDate, formatMoney, formatNumber, initials, pickLocalized } from '../lib/format';
import { sellerOrders, sellerProducts, sellerRevenueSeries } from '../lib/mock';

export default function SellerDashboard() {
  const revenue30 = sellerRevenueSeries.reduce((s, p) => s + p.revenue, 0);
  const orders30 = sellerRevenueSeries.reduce((s, p) => s + p.orders, 0);
  const pendingOrders = sellerOrders.filter((o) => ['PENDING', 'CONFIRMED', 'PAID'].includes(o.status)).length;
  const activeProducts = sellerProducts.filter((p) => p.status === 'ACTIVE').length;
  const lowStock = sellerProducts.filter((p) => p.stock <= 10 && p.status === 'ACTIVE').length;

  const recentOrders = [...sellerOrders]
    .sort((a, b) => +new Date(b.placedAt) - +new Date(a.placedAt))
    .slice(0, 6);

  const topProducts = [...sellerProducts].sort((a, b) => b.soldCount - a.soldCount).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mening do`konim"
        description="Sotuvlaringizning umumiy holati va shoshilinch ishlar"
      />

      {lowStock > 0 ? (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Diqqat: {lowStock} ta mahsulot tugayapti</AlertTitle>
          <AlertDescription>
            Stokni to`ldiring — aks holda buyurtmalar avtomatik bekor qilinadi.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Bu oy daromad"
          value={formatMoney(revenue30)}
          delta={9.4}
          icon={DollarSign}
          accent="success"
        />
        <KpiCard
          label="Buyurtmalar"
          value={formatNumber(orders30)}
          delta={4.1}
          icon={TrendingUp}
          accent="info"
          hint="oxirgi 30 kun"
        />
        <KpiCard
          label="Faol mahsulot"
          value={formatNumber(activeProducts)}
          icon={Package}
          accent="primary"
        />
        <KpiCard
          label="Reyting"
          value="4.8"
          icon={Star}
          accent="warning"
          hint="232 sharh asosida"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daromad dinamikasi</CardTitle>
            <p className="text-xs text-muted-foreground">Oxirgi 30 kun</p>
          </CardHeader>
          <CardContent>
            <RevenueChart data={sellerRevenueSeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sotuvchining holati</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge tone="success">Faol</StatusBadge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Komissiya</span>
              <span className="font-medium">10%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">SLA bajarish</span>
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                98.4%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Kutilayotgan payout</span>
              <span className="font-semibold">{formatMoney(2_450_000)}</span>
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/finance">Hisob-kitobni ko`rish</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Yangi buyurtmalar</CardTitle>
              <p className="text-xs text-muted-foreground">
                {pendingOrders} ta jo`natishni kutmoqda
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-8">
              <Link href="/orders">
                Barchasi <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-muted/40">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-[10px]">{initials(o.customerName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-mono font-medium">{o.number}</span>
                      <SellerOrderStatusBadge status={o.status} />
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {o.customerName} · {o.city} · {o.itemsCount} mahsulot
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
          <CardHeader>
            <CardTitle>Top mahsulotlar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {topProducts.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{pickLocalized(p.name)}</div>
                    <div className="text-xs text-muted-foreground">{formatNumber(p.soldCount)} sotilgan</div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
