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

import { meSeller, type SellerShop } from '@/lib/auth/client';

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
  /** Biror varianti o'z chegarasidan (reorderPoint) kam qolgan. */
  lowStock: boolean;
  imageUrl: string;
}

interface StatsResponse {
  kpi: { revenue: number; ordersCount: number; rating: number | null };
  revenueSeries: Array<{ date: string; revenue: number }>;
}

const SHOP_STATUS: Record<
  SellerShop['status'],
  { label: string; tone: 'success' | 'warning' | 'danger' }
> = {
  ACTIVE: { label: 'Faol', tone: 'success' },
  PENDING: { label: 'Tasdiq kutilmoqda', tone: 'warning' },
  SUSPENDED: { label: 'To‘xtatilgan', tone: 'danger' },
  BLOCKED: { label: 'Bloklangan', tone: 'danger' },
};

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

export default function SellerDashboard() {
  const [orders, setOrders] = React.useState<OrderRow[]>([]);
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [stats, setStats] = React.useState<StatsResponse | null>(null);
  const [shop, setShop] = React.useState<SellerShop | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      try {
        // Daromad raqamlari /api/stats dan — analitika sahifasi bilan BIR XIL ta'rif
        // (ilgari bu yerda buyurtmalardan qayta hisoblanardi: bekor qilingan va
        // qaytarilganlar ham qo'shilardi, kunlar UTC bo'yicha edi — audit O2, P4).
        const [oRes, pRes, sRes, meRes] = await Promise.all([
          fetch('/api/orders', { credentials: 'same-origin' }).then(
            (r) => r.json() as Promise<ApiResult<{ items: OrderRow[] }>>,
          ),
          fetch('/api/products', { credentials: 'same-origin' }).then(
            (r) => r.json() as Promise<ApiResult<{ items: ProductRow[] }>>,
          ),
          fetch('/api/stats', { credentials: 'same-origin' }).then(
            (r) => r.json() as Promise<ApiResult<StatsResponse>>,
          ),
          meSeller(),
        ]);
        if (oRes.success && oRes.data) setOrders(oRes.data.items);
        if (pRes.success && pRes.data) setProducts(pRes.data.items);
        if (sRes.success && sRes.data) setStats(sRes.data);
        if (meRes.success) setShop(meRes.data.seller);
      } catch {
        toast({ title: 'Tarmoq xatosi', variant: 'destructive' });
      }
      setLoading(false);
    })();
  }, []);

  const revenue30 = stats?.kpi.revenue ?? 0;
  const orders30 = stats?.kpi.ordersCount ?? 0;
  const pendingOrders = orders.filter((o) =>
    ['PENDING', 'CONFIRMED', 'PAID'].includes(o.status),
  ).length;
  const activeProducts = products.filter((p) => p.status === 'ACTIVE').length;
  const lowStock = products.filter((p) => p.lowStock && p.status === 'ACTIVE').length;
  // Sharhlar soni bo'yicha vaznli o'rtacha (server hisoblaydi); sharh yo'q bo'lsa «—».
  const avgRating = stats?.kpi.rating != null ? stats.kpi.rating.toFixed(1) : '—';
  const revenueSeries = stats?.revenueSeries ?? [];
  const shopStatus = shop ? SHOP_STATUS[shop.status] : null;

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

      {shop?.status === 'SUSPENDED' ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Do‘koningiz vaqtincha to‘xtatilgan</AlertTitle>
          <AlertDescription>
            Tovarlaringiz vitrinada ko‘rinmaydi va o‘zgartirish mumkin emas.
            {shop.suspendReason ? ` Sabab: ${shop.suspendReason}.` : ''} Admin bilan bog‘laning.
          </AlertDescription>
        </Alert>
      ) : null}

      {lowStock > 0 ? (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Diqqat: {lowStock} ta mahsulot tugayapti</AlertTitle>
          <AlertDescription>
            Zaxira tugasa tovar vitrinada «sotuvda yo`q» bo`lib qoladi — «Inventar» bo`limida
            to`ldiring.
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
            <p className="text-muted-foreground text-xs">Oxirgi 30 kun</p>
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
              {shopStatus ? (
                <StatusBadge tone={shopStatus.tone}>{shopStatus.label}</StatusBadge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
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
              <p className="text-muted-foreground text-xs">
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
            {recentOrders.length === 0 ? (
              <div className="text-muted-foreground px-6 py-8 text-center text-sm">
                <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500" />
                Hozircha yangi buyurtma yo`q
              </div>
            ) : (
              <ul className="divide-y">
                {recentOrders.map((o) => (
                  <li
                    key={o.id}
                    className="hover:bg-muted/40 flex items-center gap-3 px-6 py-3 text-sm"
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
                      <div className="text-muted-foreground truncate text-xs">
                        {o.customer.name} · {o.address ?? '—'} · {o.itemCount} mahsulot
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatMoney(Number(o.sellerSubtotal))}</div>
                      <div className="text-muted-foreground text-xs">
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
              <div className="text-muted-foreground px-6 py-8 text-center text-sm">
                Mahsulot yo`q
              </div>
            ) : (
              <ul className="divide-y">
                {topProducts.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                    <span className="bg-muted grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold">
                      {i + 1}
                    </span>
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{pickLocalized(p.name)}</div>
                      <div className="text-muted-foreground text-xs">
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
