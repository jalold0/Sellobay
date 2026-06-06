'use client';

import {
  Button,
  Card,
  DataTable,
  Input,
  KpiCard,
  PageHeader,
  toast,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, ArrowDownToLine, Boxes, Save } from 'lucide-react';
import * as React from 'react';

import { formatMoney, formatNumber, pickLocalized } from '../../lib/format';
import { sellerProducts, type SellerProduct } from '../../lib/mock';

export default function SellerInventoryPage() {
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});

  const totalStock = sellerProducts.reduce((s, p) => s + p.stock, 0);
  const inventoryValue = sellerProducts.reduce((s, p) => s + p.stock * p.basePrice, 0);
  const lowStock = sellerProducts.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStock = sellerProducts.filter((p) => p.stock === 0).length;

  const dirtyCount = Object.values(drafts).filter((v) => v && v !== '').length;

  const onCommit = () => {
    toast({
      title: 'Stok yangilandi',
      description: `${dirtyCount} ta mahsulot uchun stok saqlandi`,
      variant: 'success',
    });
    setDrafts({});
  };

  const columns: ColumnDef<SellerProduct>[] = [
    {
      accessorKey: 'name',
      header: 'Mahsulot',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={row.original.imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{pickLocalized(row.original.name)}</div>
            <div className="truncate text-xs text-muted-foreground">{row.original.sku}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'stock',
      header: () => <div className="text-right">Joriy stok</div>,
      cell: ({ row }) => (
        <div
          className={
            row.original.stock === 0
              ? 'text-right font-mono text-red-600'
              : row.original.stock <= 10
              ? 'text-right font-mono text-amber-600'
              : 'text-right font-mono'
          }
        >
          {formatNumber(row.original.stock)}
        </div>
      ),
    },
    {
      id: 'set',
      header: () => <div className="text-right">Yangi miqdor</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={String(row.original.stock)}
            value={drafts[row.original.id] ?? ''}
            onChange={(e) =>
              setDrafts((s) => ({ ...s, [row.original.id]: e.target.value }))
            }
            className="h-8 w-24 text-right"
          />
        </div>
      ),
    },
    {
      accessorKey: 'basePrice',
      header: () => <div className="text-right">Narx</div>,
      cell: ({ row }) => (
        <div className="text-right text-sm text-muted-foreground">
          {formatMoney(row.original.basePrice)}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventar"
        description="Stok darajalarini bir joyda boshqaring"
        actions={
          <>
            <Button variant="outline" size="sm">
              <ArrowDownToLine className="mr-2 h-4 w-4" /> CSV eksport
            </Button>
            <Button size="sm" disabled={!dirtyCount} onClick={onCommit}>
              <Save className="mr-2 h-4 w-4" /> {dirtyCount > 0 ? `${dirtyCount} ni saqlash` : 'Saqlash'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Jami stok" value={formatNumber(totalStock)} icon={Boxes} accent="primary" />
        <KpiCard label="Inventar qiymati" value={formatMoney(inventoryValue)} accent="success" />
        <KpiCard label="Quyi-stok" value={formatNumber(lowStock)} icon={AlertTriangle} accent="warning" />
        <KpiCard label="Tugagan" value={formatNumber(outOfStock)} accent="danger" />
      </div>

      <Card className="p-1">
        <DataTable
          columns={columns}
          data={sellerProducts}
          searchPlaceholder="Nomi yoki SKU..."
        />
      </Card>
    </div>
  );
}
