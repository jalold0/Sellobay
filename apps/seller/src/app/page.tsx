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
  Skeleton,
  StatusBadge,
  toast,
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
import * as React from 'react';

import { RevenueChart } from '../components/charts/revenue-chart';
import { SellerOrderStatusBadge } from '../components/order-status-badge';
import { formatDate, formatMoney, formatNumber, initials, pickLocalized } from '../lib/format';

type LocalizedText = { uz: string; ru?: string; en?: string };

interface OrderRow {
  id: string;
  number: string;
  status:
    | 'PENDING'
    | 'CONFIRMED'
    | 'PAID'
    | 'PROCESSING'
    | 'PACKED'
    | 'SHIPPED'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'RETURNED';
  placedAt: string;
  customer: { name: string };
  address: string | null;
  sellerSubtotal: string;
  itemCount: number;
}

interface ProductRow {
  id: string;
  name: LocalizedText;
  status: string;
  soldCount: number;
  stock: number;
  imageUrl: string;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

export default function SellerDashboard() {
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      try {
        const [oRes, pRes] = await Promise.all([
          fetch('/api/orders', { credentials: 'same-origin' }).then(
            (r) => r.json() as Promise<ApiResult<{ items: OrderRow[] }>>,
          ),
          fetch('/api/products', { credentials: 'same-origin' }).then(
            (r) => r.json() as Promise<ApiResult<{ items: ProductRow[] }>>,
          ),
        ]);
        if (oRes.success && oRes.data) setOrders(oRes.data.items);
        if (pRes.success && pRes.data) setProducts(pRes.data.items);
      } catch {
        toast({ title: 'Tarmoq xatosi', variant: 'destructive' });
      }
      setLoading(false);
    })();
  }, []);

  const revenue30 = orders.reduce((s, o) => s + Number(o.sellerSubtotal), 0);
  const orders30 = orders.length;
  const pendingOrders = orders.filter((o) =>
    ['PENDING', 'CONFIRMED', 'PAID'].includes(o.status),
  ).length;
  const activeProducts = products.filter((p) => p.status === 'ACTIVE').length;
  const lowStock = products.filter((p) => p.stock <= 10 && p.status === 'ACTIVE').length;
  const avgRating =
    products.length > 0
      ? (
          products.reduce((s, p) => s + ((p as { rating?: number }).rating ?? 0), 0) /
          products.length
        ).toFixed(1)
      : '—';

  // Daromad dinamikasi — oxirgi 30 kun, kunlik (real buyurtmalardan)
  const revenueSeries = React.useMemo(() => {
    const days: Array<{ date: string; revenue: number }> = [];
    const byDay = new Map<string, number>();
    for (const o of orders) {
      const d = o.placedAt.slice(0, 10);
      byDay.set(d, (byDay.get(d) ?? 0) + Number(o.sellerSubtotal));
    }
    const today = new Date(orders[0]?.placedAt ?? '2026-06-28');
    for (let i = 29; i >= 0; i--) {
      const dt = new Date(today.getTime() - i * 86_400_000).toISOString().slice(0, 10);
      days.push({ date: dt, revenue: byDay.get(dt) ?? 0 });
    }
    return days;
  }, [orders]);

  const recentOrders = orders.slice(0, 6);
  const topProducts = [...products].sort((a, b) => b.soldCount - a.soldCount).slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mening do`konim" description="Sotuvlaringizning umumiy holati" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

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
          label="Jami daromad"
          value={formatMoney(revenue30)}
          icon={DollarSign}
          accent="success"
        />
        <KpiCard
          label="Buyurtmalar"
          value={formatNumber(orders30)}
          icon={TrendingUp}
          accent="info"
        />
        <KpiCard
          label="Faol mahsulot"
          value={formatNumber(activeProducts)}
          icon={Package}
          accent="primary"
        />
        <KpiCard label="O`rtacha reyting" value={String(avgRating)} icon={Star} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daromad dinamikasi</CardTitle>
            <p className="text-xs text-muted-foreground">Oxirgi 30 kun</p>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueSeries} />
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
              <span className="text-muted-foreground">Jo`natishni kutmoqda</span>
              <span className="font-medium">{pendingOrders} ta</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Mahsulotlar</span>
              <span className="font-medium">{formatNumber(products.length)} ta</span>
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
              <p className="text-xs text-muted-foreground">{pendingOrders} ta jo`natishni kutmoqda</p>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-8">
              <Link href="/orders">
                Barchasi <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
                Hozircha yangi buyurtma yo`q
              </div>
            ) : (
              <ul className="divide-y">
                {recentOrders.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-muted/40"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[10px]">
                        {initials(o.customer.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-mono font-medium">{o.number}</span>
                        <SellerOrderStatusBadge status={o.status} />
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {o.customer.name} · {o.address ?? '—'} · {o.itemCount} mahsulot
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatMoney(Number(o.sellerSubtotal))}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(new Date(o.placedAt))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top mahsulotlar</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {topProducts.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-muted-foreground">
                Mahsulot yo`q
              </div>
            ) : (
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
                      <div className="text-xs text-muted-foreground">
                        {formatNumber(p.soldCount)} sotilgan
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
