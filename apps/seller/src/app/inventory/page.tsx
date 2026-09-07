'use client';

import { Button, Card, DataTable, Input, KpiCard, PageHeader, toast } from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, ArrowDownToLine, Boxes, Save } from 'lucide-react';
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

  const totalStock = rows.reduce((s, p) => s + p.stock, 0);
  const inventoryValue = rows.reduce((s, p) => s + p.stock * p.basePrice, 0);
  const lowStock = rows.filter((p) => p.stock > 0 && p.stock <= 10).length;
  const outOfStock = rows.filter((p) => p.stock === 0).length;

  /** Faqat haqiqatan o'zgargan va tahrirlanadigan qatorlar. */
  const pending = React.useMemo(() => {
    const out: Array<{ productId: string; quantity: number }> = [];
    for (const row of rows) {
      const raw = drafts[row.id];
      if (raw === undefined || raw === '') continue;
      const quantity = Number(raw);
      if (!Number.isInteger(quantity) || quantity < 0) continue;
      if (quantity === row.stock) continue; // o'zgarish yo'q
      if (!row.editable) continue;
      out.push({ productId: row.id, quantity });
    }
    return out;
  }, [rows, drafts]);

  const onCommit = async () => {
    if (pending.length === 0 || saving) return;
    setSaving(true);
    const res = await updateInventory(pending);
    setSaving(false);

    if (!res.success) {
      // Muvaffaqiyat xabari FAQAT server tasdiqlaganda chiqadi. Ilgari bu
      // sahifa hech qanday so'rov yubormasdan "Stok yangilandi" deb yozardi.
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }

    const { updated, skipped } = res.data;
    toast({
      title: `${updated} ta mahsulot stoki yangilandi`,
      description:
        skipped.length > 0
          ? `${skipped.length} ta mahsulot o'tkazib yuborildi (bir nechta variantli): ${skipped.join(', ')}`
          : undefined,
      variant: 'success',
    });
    setDrafts({});
    await load(); // serverdagi haqiqiy qiymatni qayta o'qiymiz
  };

  const columns: ColumnDef<InventoryRow>[] = [
    {
      accessorKey: 'name',
      header: 'Mahsulot',
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
            <div className="text-muted-foreground truncate text-xs">{row.original.sku}</div>
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
      cell: ({ row }) =>
        row.original.editable ? (
          <div className="flex justify-end">
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={String(row.original.stock)}
              value={drafts[row.original.id] ?? ''}
              onChange={(e) => setDrafts((s) => ({ ...s, [row.original.id]: e.target.value }))}
              className="h-8 w-24 text-right"
            />
          </div>
        ) : (
          <div className="text-muted-foreground text-right text-xs">
            {row.original.variantCount} variant
          </div>
        ),
    },
    {
      accessorKey: 'basePrice',
      header: () => <div className="text-right">Narx</div>,
      cell: ({ row }) => (
        <div className="text-muted-foreground text-right text-sm">
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
            <Button variant="outline" size="sm" disabled>
              <ArrowDownToLine className="mr-2 h-4 w-4" /> CSV eksport
            </Button>
            <Button size="sm" disabled={pending.length === 0 || saving} onClick={onCommit}>
              <Save className="mr-2 h-4 w-4" />
              {saving
                ? 'Saqlanmoqda...'
                : pending.length > 0
                  ? `${pending.length} ni saqlash`
                  : 'Saqlash'}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Jami stok" value={formatNumber(totalStock)} icon={Boxes} accent="primary" />
        <KpiCard label="Inventar qiymati" value={formatMoney(inventoryValue)} accent="success" />
        <KpiCard
          label="Quyi-stok"
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
            Hozircha mahsulot yo`q. Avval mahsulot qo`shing.
          </div>
        ) : (
          <DataTable columns={columns} data={rows} searchPlaceholder="Nomi yoki SKU..." />
        )}
      </Card>
    </div>
  );
}
