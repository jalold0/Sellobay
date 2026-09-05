'use client';

import { Card, CardContent, CardHeader, CardTitle, KpiCard, PageHeader, toast } from '@ecom/ui';
import { AlertTriangle, Box, Boxes, Warehouse } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import {
  listInventory,
  type AdminInventoryRow,
  type AdminInventorySummary,
} from '../../lib/auth/client';
import { formatMoney, formatNumber, pickLocalized } from '../../lib/format';

export default function AdminInventoryPage() {
  const [items, setItems] = React.useState<AdminInventoryRow[]>([]);
  const [summary, setSummary] = React.useState<AdminInventorySummary | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    void listInventory().then((res) => {
      if (!alive) return;
      if (res.success) {
        setItems(res.data.items);
        setSummary(res.data.summary);
      } else {
        toast({ title: res.error.message, variant: 'destructive' });
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const lowStockItems = items
    .filter((p) => p.status === 'ACTIVE' && p.stock <= (summary?.threshold ?? 10))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 12);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Inventar"
        description="Platforma bo`yicha stok holati"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Jami stok"
          value={formatNumber(summary?.totalStock ?? 0)}
          icon={Boxes}
          accent="primary"
        />
        <KpiCard
          label="Inventar qiymati"
          value={formatMoney(summary?.inventoryValue ?? 0)}
          icon={Box}
          accent="success"
        />
        <KpiCard
          label="Quyi-stok"
          value={formatNumber(summary?.lowStock ?? 0)}
          icon={AlertTriangle}
          accent="warning"
        />
        <KpiCard
          label="Tugagan"
          value={formatNumber(summary?.outOfStock ?? 0)}
          icon={Warehouse}
          accent="danger"
        />
      </div>

      {/*
        "Omborlar" bloki olib tashlandi: u uchta ombor va ularning stok/qiymat
        raqamlarini kodga yozib qo'ygan edi (WH-TAS-01 18 240 dona, WH-SAM-01
        va WH-NUK-01) — bazada esa MVP'da bitta ombor bor
        (WH-TASHKENT-MAIN) va u raqamlarning hech biri haqiqiy emas edi.
        Ko'p omborli hisob qo'shilganda qaytariladi.
      */}

      <Card>
        <CardHeader>
          <CardTitle>Quyi-stok ogohlantirish</CardTitle>
          <p className="text-muted-foreground text-xs">
            {summary?.threshold ?? 10} dona va undan kam qolgan sotuvdagi tovarlar
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-muted-foreground p-10 text-center text-sm">Yuklanmoqda...</div>
          ) : lowStockItems.length === 0 ? (
            <div className="text-muted-foreground p-10 text-center text-sm">
              Hammasi joyida — quyi-stok tovar yo`q.
            </div>
          ) : (
            <ul className="divide-y">
              {lowStockItems.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                  <div className="bg-muted h-9 w-9 shrink-0 overflow-hidden rounded">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{pickLocalized(p.name)}</div>
                    <div className="text-muted-foreground truncate text-xs">
                      {p.sku}
                      {p.sellerName ? ` · ${p.sellerName}` : ''}
                    </div>
                  </div>
                  <span
                    className={
                      p.stock === 0
                        ? 'rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300'
                        : 'rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    }
                  >
                    {p.stock === 0 ? 'Tugagan' : `${p.stock} qoldi`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
