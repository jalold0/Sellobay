'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  KpiCard,
  PageHeader,
} from '@ecom/ui';
import { AlertTriangle, Box, Boxes, Warehouse } from 'lucide-react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { formatMoney, formatNumber, pickLocalized } from '../../lib/format';
import { mockProducts } from '../../lib/mock';

export default function AdminInventoryPage() {
  const totalStock = mockProducts.reduce((s, p) => s + p.stock, 0);
  const inventoryValue = mockProducts.reduce((s, p) => s + p.stock * p.basePrice, 0);
  const lowStock = mockProducts.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStock = mockProducts.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Inventar"
        description="Stok darajalari va omborlar bo`yicha"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Jami stok" value={formatNumber(totalStock)} icon={Boxes} accent="primary" />
        <KpiCard label="Inventar qiymati" value={formatMoney(inventoryValue)} icon={Box} accent="success" />
        <KpiCard label="Quyi-stok" value={formatNumber(lowStock)} icon={AlertTriangle} accent="warning" />
        <KpiCard label="Tugagan" value={formatNumber(outOfStock)} icon={Warehouse} accent="danger" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Omborlar</CardTitle>
          <p className="text-xs text-muted-foreground">3 ta faol ombor</p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {[
            { code: 'WH-TAS-01', name: 'Toshkent markaz', stock: 18_240, value: 2_850_000_000 },
            { code: 'WH-SAM-01', name: 'Samarqand', stock: 5_120, value: 940_000_000 },
            { code: 'WH-NUK-01', name: 'Nukus', stock: 2_840, value: 420_000_000 },
          ].map((w) => (
            <div key={w.code} className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <Warehouse className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-mono text-muted-foreground">{w.code}</span>
              </div>
              <div className="mt-2 font-medium">{w.name}</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Stok</div>
                  <div className="font-semibold">{formatNumber(w.stock)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Qiymat</div>
                  <div className="font-semibold">{formatMoney(w.value)}</div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quyi-stok ogohlantirish</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {mockProducts
              .filter((p) => p.stock <= 10 && p.status !== 'ARCHIVED')
              .slice(0, 12)
              .map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-6 py-3 text-sm">
                  <div className="h-9 w-9 shrink-0 overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{pickLocalized(p.name)}</div>
                    <div className="truncate text-xs text-muted-foreground">{p.sku}</div>
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
        </CardContent>
      </Card>
    </div>
  );
}
