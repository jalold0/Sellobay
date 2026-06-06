'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  KpiCard,
  PageHeader,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { Gift, Mail, MessageCircle, Plus, Send, Tag, Target } from 'lucide-react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { formatDate, formatMoney, formatNumber } from '../../lib/format';
import { mockPromoCodes, type PromoCode } from '../../lib/mock';

const promoColumns: ColumnDef<PromoCode>[] = [
  {
    accessorKey: 'code',
    header: 'Kod',
    cell: ({ row }) => (
      <span className="font-mono font-semibold uppercase">{row.original.code}</span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Turi',
    cell: ({ row }) => {
      const t = row.original.type;
      return (
        <StatusBadge tone="info" dot={false}>
          {t === 'PERCENT' ? 'Foiz' : t === 'FIXED' ? 'Qat`iy' : t === 'FREE_SHIPPING' ? 'Tekin yetkazib berish' : 'BXGY'}
        </StatusBadge>
      );
    },
  },
  {
    accessorKey: 'value',
    header: () => <div className="text-right">Qiymat</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {row.original.type === 'PERCENT'
          ? `${row.original.value}%`
          : row.original.type === 'FIXED'
          ? formatMoney(row.original.value)
          : '—'}
      </div>
    ),
  },
  {
    accessorKey: 'usedCount',
    header: 'Foydalanish',
    cell: ({ row }) => {
      const used = row.original.usedCount;
      const limit = row.original.usageLimit;
      const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
      return (
        <div className="w-32 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span>{formatNumber(used)}</span>
            <span className="text-muted-foreground">{limit ? formatNumber(limit) : '∞'}</span>
          </div>
          {limit ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${pct}%` }}
              />
            </div>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: 'endsAt',
    header: 'Tugaydi',
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.endsAt ? formatDate(row.original.endsAt) : 'Cheksiz'}
      </span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) =>
      row.original.isActive ? (
        <StatusBadge tone="success">Faol</StatusBadge>
      ) : (
        <StatusBadge tone="muted">Faol emas</StatusBadge>
      ),
  },
];

export default function AdminMarketingPage() {
  const activePromos = mockPromoCodes.filter((p) => p.isActive).length;
  const totalRedeemed = mockPromoCodes.reduce((s, p) => s + p.usedCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Marketing"
        description="Aksiyalar, kampaniyalar, sodiqlik dasturi"
        actions={
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" /> Yangi kampaniya
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Faol aksiyalar" value={formatNumber(activePromos)} icon={Tag} accent="primary" />
        <KpiCard label="Jami foydalanish" value={formatNumber(totalRedeemed)} icon={Gift} accent="success" />
        <KpiCard label="Push ulashi (CTR)" value="14.2%" icon={Send} accent="info" />
        <KpiCard label="Email ochilishi" value="32.7%" icon={Mail} accent="warning" />
      </div>

      <Tabs defaultValue="promos">
        <TabsList>
          <TabsTrigger value="promos">
            <Tag className="mr-1 h-3.5 w-3.5" /> Promo-kodlar
          </TabsTrigger>
          <TabsTrigger value="campaigns">
            <Send className="mr-1 h-3.5 w-3.5" /> Kampaniyalar
          </TabsTrigger>
          <TabsTrigger value="loyalty">
            <Gift className="mr-1 h-3.5 w-3.5" /> Sodiqlik
          </TabsTrigger>
          <TabsTrigger value="segments">
            <Target className="mr-1 h-3.5 w-3.5" /> Segmentlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="promos">
          <Card className="p-1">
            <DataTable columns={promoColumns} data={mockPromoCodes} searchPlaceholder="Kod yoki turi..." />
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'Navro`z 2026', channel: 'PUSH', sent: 12400, ctr: '12.4%', icon: Send },
              { name: 'Black Friday', channel: 'EMAIL', sent: 8700, ctr: '28.1%', icon: Mail },
              { name: 'VIP rebranding', channel: 'TELEGRAM', sent: 3200, ctr: '19.7%', icon: MessageCircle },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <Card key={c.name}>
                  <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                    <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">{c.name}</CardTitle>
                      <p className="text-xs text-muted-foreground">{c.channel}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">Yuborilgan</div>
                      <div className="font-semibold">{formatNumber(c.sent)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">CTR</div>
                      <div className="font-semibold">{c.ctr}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="loyalty">
          <Card>
            <CardHeader>
              <CardTitle>Sodiqlik dasturi</CardTitle>
              <p className="text-xs text-muted-foreground">Har 10 000 UZS — 100 ball. Ballarni keyingi xaridda ishlatish mumkin.</p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <div className="rounded-md border p-4">
                <div className="text-xs text-muted-foreground">Jami foydalanuvchilar</div>
                <div className="text-2xl font-bold">12 480</div>
              </div>
              <div className="rounded-md border p-4">
                <div className="text-xs text-muted-foreground">Faol ballar</div>
                <div className="text-2xl font-bold">3.2M</div>
              </div>
              <div className="rounded-md border p-4">
                <div className="text-xs text-muted-foreground">Bu oy yondirilgan</div>
                <div className="text-2xl font-bold">142 K</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments">
          <Card>
            <CardHeader>
              <CardTitle>Segmentlar</CardTitle>
              <p className="text-xs text-muted-foreground">RFM, xulq-atvor va sotib olish tarixiga ko`ra</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {[
                  { name: 'VIP', size: 245, color: '#f59e0b' },
                  { name: 'Yangi mijozlar (30 kun)', size: 1320, color: '#22c55e' },
                  { name: 'Yo`qotilgan (90+ kun)', size: 642, color: '#ef4444' },
                  { name: 'Tug`ilgan kuni shu oyda', size: 184, color: '#8b5cf6' },
                  { name: 'Yuqori chek', size: 412, color: '#0ea5e9' },
                  { name: 'Push obunachilar', size: 8430, color: '#06b6d4' },
                ].map((s) => (
                  <div key={s.name} className="rounded-md border p-4">
                    <div className="flex items-center justify-between">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ background: s.color }}
                      />
                      <Button variant="ghost" size="sm" className="h-6 text-xs">
                        Eksport
                      </Button>
                    </div>
                    <div className="mt-2 text-sm font-medium">{s.name}</div>
                    <div className="text-2xl font-bold">{formatNumber(s.size)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
