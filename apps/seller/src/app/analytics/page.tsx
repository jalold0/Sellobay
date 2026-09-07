'use client';

import { Card, CardContent, CardHeader, CardTitle, KpiCard, PageHeader, toast } from '@ecom/ui';
import { Star, TrendingUp } from 'lucide-react';
import * as React from 'react';

import { RevenueChart } from '../../components/charts/revenue-chart';
import { getSellerStats, type SellerStats } from '../../lib/auth/client';
import { formatMoney, formatNumber, pickLocalized } from '../../lib/format';

/** Ikki davr orasidagi foiz o'zgarish; oldingi davr bo'sh bo'lsa ko'rsatilmaydi. */
function deltaPct(current: number, previous: number): number | undefined {
  if (previous <= 0) return undefined;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export default function SellerAnalyticsPage() {
  // Barcha ko'rsatkich BAZADAN. Ilgari "Daromad +9.4%", "Konversiya 3.8%",
  // "Reyting 4.8" va "Karta ko'rishlari" (Web 12 450 / Mobil 8 430 /
  // Telegram 4 720) kodga yozib qo'yilgan sonlar edi.
  const [stats, setStats] = React.useState<SellerStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    void getSellerStats().then((res) => {
      if (!alive) return;
      if (res.success) setStats(res.data);
      else toast({ title: res.error.message, variant: 'destructive' });
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="text-muted-foreground py-20 text-center text-sm">Yuklanmoqda...</div>;
  }
  if (!stats) {
    return (
      <div className="text-muted-foreground py-20 text-center text-sm">
        Ma`lumotni yuklab bo`lmadi
      </div>
    );
  }

  const { kpi, revenueSeries, topProducts } = stats;

  return (
    <div className="space-y-6">
      <PageHeader title="Analitika" description="Sotuvlaringiz va mahsulot samaradorligi" />

      {/*
        "Konversiya" olib tashlandi — uni hisoblash uchun mahsulot sahifasi
        ko'rishlari kerak, bazada esa ko'rish kuzatuvi YO'Q edi (ko'rsatkich
        "3.8%" deb yozib qo'yilgandi).
      */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={`Daromad (${kpi.windowDays}k)`}
          value={formatMoney(kpi.revenue)}
          delta={deltaPct(kpi.revenue, kpi.revenuePrev)}
          icon={TrendingUp}
          accent="success"
        />
        <KpiCard
          label={`Buyurtmalar (${kpi.windowDays}k)`}
          value={formatNumber(kpi.ordersCount)}
          delta={deltaPct(kpi.ordersCount, kpi.ordersPrev)}
          accent="info"
        />
        <KpiCard label="O`rtacha chek" value={formatMoney(kpi.avgCheck)} accent="primary" />
        <KpiCard
          label="Reyting"
          value={kpi.rating == null ? '—' : String(kpi.rating)}
          icon={Star}
          accent="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daromad dinamikasi</CardTitle>
          <p className="text-muted-foreground text-xs">
            Oxirgi {kpi.windowDays} kun · faqat sizning mahsulotlaringiz bo`yicha
          </p>
        </CardHeader>
        <CardContent>
          <RevenueChart data={revenueSeries} height={280} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top mahsulotlar (sotuv bo`yicha)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {topProducts.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              Hozircha mahsulot yo`q.
            </div>
          ) : (
            <ul className="divide-y">
              {topProducts.map((p, i) => (
                <li key={p.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                  <span className="bg-muted grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold">
                    {i + 1}
                  </span>
                  <div className="bg-muted h-9 w-9 shrink-0 overflow-hidden rounded">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{pickLocalized(p.name)}</div>
                    <div className="text-muted-foreground text-xs">{p.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatNumber(p.soldCount)}</div>
                    {/*
                      Ilgari bu yerda "ko'rishlar" `reviewCount * 30` formulasi
                      bilan YASALARDI — bu son hech qanday haqiqiy ko'rsatkich
                      emas edi. O'rniga haqiqiy sharh soni.
                    */}
                    <div className="text-muted-foreground text-xs">
                      <Star className="inline h-3 w-3" /> {p.rating.toFixed(1)} ·{' '}
                      {formatNumber(p.reviewCount)} sharh
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
