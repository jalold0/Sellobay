'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  KpiCard,
  PageHeader,
} from '@ecom/ui';
import { Eye, Percent, Star, TrendingUp } from 'lucide-react';

import { RevenueChart } from '../../components/charts/revenue-chart';
import { formatMoney, formatNumber, pickLocalized } from '../../lib/format';
import { sellerProducts, sellerRevenueSeries } from '../../lib/mock';

export default function SellerAnalyticsPage() {
  const revenue30 = sellerRevenueSeries.reduce((s, p) => s + p.revenue, 0);
  const orders30 = sellerRevenueSeries.reduce((s, p) => s + p.orders, 0);
  const top = [...sellerProducts].sort((a, b) => b.soldCount - a.soldCount).slice(0, 6);
  const aov = revenue30 / Math.max(orders30, 1);

  return (
    <div className="space-y-6">
      <PageHeader title="Analitika" description="Sotuvlaringiz va mahsulot samaradorligi" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Daromad (30k)" value={formatMoney(revenue30)} delta={9.4} icon={TrendingUp} accent="success" />
        <KpiCard label="Konversiya" value="3.8%" delta={0.4} icon={Percent} accent="info" />
        <KpiCard label="O`rtacha chek" value={formatMoney(aov)} delta={2.1} accent="primary" />
        <KpiCard label="Reyting" value="4.8" icon={Star} accent="warning" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daromad dinamikasi</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={sellerRevenueSeries} height={280} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Karta ko`rishlari</CardTitle>
            <p className="text-xs text-muted-foreground">Kanal bo`yicha</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { name: 'Web', views: 12450, color: '#0ea5e9' },
              { name: 'Mobil', views: 8430, color: '#8b5cf6' },
              { name: 'Telegram', views: 4720, color: '#22c55e' },
            ].map((c) => {
              const max = 12450;
              const pct = (c.views / max) * 100;
              return (
                <div key={c.name}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="font-medium">{formatNumber(c.views)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top mahsulotlar (sotuv bo`yicha)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {top.map((p, i) => (
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
                  <div className="text-xs text-muted-foreground">{p.sku}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatNumber(p.soldCount)}</div>
                  <div className="text-xs text-muted-foreground">
                    <Eye className="inline h-3 w-3" /> {formatNumber(p.reviewCount * 30)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
