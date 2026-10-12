'use client';

import { Button, Card, DataTable, Input, KpiCard, PageHeader, toast } from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Boxes, Save } from 'lucide-react';
import * as React from 'react';

import { listInventory, updateInventory, type InventoryRow } from '../../lib/auth/client';
import { formatMoney, formatNumber, pickLocalized } from '../../lib/format';

export default function SellerInventoryPage() {
  const [rows, setRows] = React.useState<InventoryRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listInventory();
    if (res.success) {
      setRows(res.data.items);
    } else {
      toast({ title: res.error.message, variant: 'destructive' });
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const totalStock = rows.reduce((s, r) => s + r.stock, 0);
  const inventoryValue = rows.reduce((s, r) => s + r.stock * r.price, 0);
  const lowStock = rows.filter((r) => r.stock > 0 && r.stock <= r.reorderPoint).length;
  const outOfStock = rows.filter((r) => r.stock === 0).length;

  /** Faqat haqiqatan o'zgargan qatorlar; `expected` — sahifada ko'rilgan son. */
  const pending = React.useMemo(() => {
    const out: Array<{ variantId: string; quantity: number; expected: number }> = [];
    for (const row of rows) {
      const raw = drafts[row.variantId];
      if (raw === undefined || raw === '') continue;
      const quantity = Number(raw);
      if (!Number.isInteger(quantity) || quantity < 0) continue;
      if (quantity === row.stock) continue;
      out.push({ variantId: row.variantId, quantity, expected: row.stock });
    }
    return out;
  }, [rows, drafts]);

  const onCommit = async () => {
    if (pending.length === 0 || saving) return;
    setSaving(true);
    const res = await updateInventory(pending);
    setSaving(false);

    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      // Shu orada buyurtma tushgan — yangi sonlarni ko'rsatamiz, kiritilganlar qoladi.
      if (res.error.code === 'STOCK_CHANGED') await load();
      return;
    }
    toast({ title: `${res.data.updated} ta qator zaxirasi saqlandi`, variant: 'success' });
    setDrafts({});
    await load();
  };

  const columns: ColumnDef<InventoryRow>[] = [
    {
      id: 'name',
      accessorFn: (r) => `${pickLocalized(r.name)} ${r.variantLabel ?? ''} ${r.sku}`,
      header: 'Tovar',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="bg-muted h-10 w-10 shrink-0 overflow-hidden rounded-md">
            {row.original.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.original.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{pickLocalized(row.original.name)}</div>
            <div className="text-muted-foreground truncate text-xs">
              {row.original.variantLabel ? `${row.original.variantLabel}, ` : ''}
              {row.original.sku}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'stock',
      header: () => <div className="text-right">Joriy zaxira</div>,
      cell: ({ row }) => {
        const r = row.original;
        const tone =
          r.stock === 0 ? 'text-red-600' : r.stock <= r.reorderPoint ? 'text-amber-600' : '';
        return (
          <div className={`text-right tabular-nums ${tone}`}>
            {formatNumber(r.stock)}
            {r.stock > 0 && r.stock <= r.reorderPoint ? (
              <div className="text-muted-foreground text-[11px]">chegara {r.reorderPoint}</div>
            ) : null}
          </div>
        );
      },
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
            aria-label={`${pickLocalized(row.original.name)} ${row.original.variantLabel ?? ''} yangi miqdor`}
            placeholder={String(row.original.stock)}
            value={drafts[row.original.variantId] ?? ''}
            onChange={(e) => setDrafts((s) => ({ ...s, [row.original.variantId]: e.target.value }))}
            className="h-8 w-24 text-right"
          />
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: () => <div className="text-right">Narx</div>,
      cell: ({ row }) => (
        <div className="text-muted-foreground text-right text-sm">
          {formatMoney(row.original.price)}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventar"
        description="Har variant zaxirasini alohida boshqaring"
        actions={
          <Button size="sm" disabled={pending.length === 0 || saving} onClick={onCommit}>
            <Save className="mr-2 h-4 w-4" />
            {saving
              ? 'Saqlanmoqda...'
              : pending.length > 0
                ? `${pending.length} ta o‘zgarishni saqlash`
                : 'Saqlash'}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Jami zaxira"
          value={formatNumber(totalStock)}
          icon={Boxes}
          accent="primary"
        />
        <KpiCard label="Inventar qiymati" value={formatMoney(inventoryValue)} accent="success" />
        <KpiCard
          label="Kam qoldi"
          value={formatNumber(lowStock)}
          icon={AlertTriangle}
          accent="warning"
        />
        <KpiCard label="Tugagan" value={formatNumber(outOfStock)} accent="danger" />
      </div>

      <Card className="p-1">
        {loading ? (
          <div className="text-muted-foreground p-10 text-center text-sm">Yuklanmoqda...</div>
        ) : rows.length === 0 ? (
          <div className="text-muted-foreground p-10 text-center text-sm">
            Hozircha tovar yo`q. Avval «Mahsulotlarim» bo`limida tovar qo`shing.
          </div>
        ) : (
          <DataTable columns={columns} data={rows} searchPlaceholder="Nomi, variant yoki SKU..." />
        )}
      </Card>
    </div>
  );
}
