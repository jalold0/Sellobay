'use client';

import {
  Button,
  Card,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  PageHeader,
  StatusBadge,
  toast,
  type StatusTone,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus, Users } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import {
  cancelGroupBuy,
  createGroupBuy,
  listGroupBuys,
  listProducts,
  type AdminGroupBuy,
  type AdminProduct,
} from '../../lib/auth/client';
import { formatDate, formatMoney, formatNumber, pickLocalized } from '../../lib/format';

const STATUS_CFG: Record<AdminGroupBuy['status'], { label: string; tone: StatusTone }> = {
  OPEN: { label: 'Ochiq', tone: 'info' },
  COMPLETED: { label: 'To`ldi', tone: 'success' },
  EXPIRED: { label: 'Muddati tugagan', tone: 'muted' },
  CANCELLED: { label: 'Bekor qilingan', tone: 'danger' },
};

export default function AdminGroupBuyPage() {
  const [rows, setRows] = React.useState<AdminGroupBuy[]>([]);
  const [products, setProducts] = React.useState<AdminProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [productId, setProductId] = React.useState('');
  const [groupPrice, setGroupPrice] = React.useState('');
  const [targetSize, setTargetSize] = React.useState('5');
  const [durationDays, setDurationDays] = React.useState('7');

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listGroupBuys();
    if (res.success) setRows(res.data.items);
    else toast({ title: res.error.message, variant: 'destructive' });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Mahsulot ro'yxati faqat forma ochilganda yuklanadi.
  React.useEffect(() => {
    if (!open || products.length > 0) return;
    void listProducts().then((res) => {
      if (res.success) setProducts(res.data.items.filter((p) => p.status === 'ACTIVE'));
    });
  }, [open, products.length]);

  const selected = products.find((p) => p.id === productId);

  const onCancel = React.useCallback(
    async (id: string) => {
      const res = await cancelGroupBuy(id);
      if (!res.success) {
        toast({ title: res.error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Guruh bekor qilindi', variant: 'success' });
      await load();
    },
    [load],
  );

  const columns: ColumnDef<AdminGroupBuy>[] = [
    {
      accessorKey: 'name',
      header: 'Mahsulot',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="bg-muted h-9 w-9 shrink-0 overflow-hidden rounded">
            {row.original.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={row.original.imageUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{pickLocalized(row.original.name)}</div>
            <div className="text-muted-foreground truncate text-xs">
              /{row.original.productSlug}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'groupPrice',
      header: () => <div className="text-right">Narx</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-semibold">{formatMoney(row.original.groupPrice)}</div>
          <div className="text-muted-foreground text-xs line-through">
            {formatMoney(row.original.soloPrice)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'currentSize',
      header: 'To`lganlik',
      cell: ({ row }) => {
        const pct = Math.min(
          100,
          Math.round((row.original.currentSize / row.original.targetSize) * 100),
        );
        return (
          <div className="w-28 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>
                {row.original.currentSize} / {row.original.targetSize}
              </span>
              <span className="text-muted-foreground">{pct}%</span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'expiresAt',
      header: 'Tugaydi',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-xs">{formatDate(row.original.expiresAt)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const cfg = STATUS_CFG[row.original.status];
        return <StatusBadge tone={cfg.tone}>{cfg.label}</StatusBadge>;
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        row.original.status === 'OPEN' ? (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600"
              onClick={() => void onCancel(row.original.id)}
            >
              Bekor qilish
            </Button>
          </div>
        ) : null,
    },
  ];

  const onCreate = async () => {
    const price = Number(groupPrice);
    const size = Number(targetSize);
    const days = Number(durationDays);
    if (!productId || !Number.isFinite(price) || price <= 0) {
      toast({ title: 'Mahsulot va narxni kiriting', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const res = await createGroupBuy({
      productId,
      groupPrice: price,
      targetSize: size,
      durationDays: days,
    });
    setSaving(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Guruh xaridi ochildi', variant: 'success' });
    setOpen(false);
    setProductId('');
    setGroupPrice('');
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Guruh xaridi"
        description="Mijozlar guruh bo`lib qo`shiladi — guruh to`lsa hamma chegirmali narxda oladi"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Yangi guruh
          </Button>
        }
      />

      <Card className="p-1">
        {loading ? (
          <div className="text-muted-foreground p-10 text-center text-sm">Yuklanmoqda...</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center">
            <Users className="text-muted-foreground mx-auto h-7 w-7" />
            <p className="mt-3 text-sm font-medium">Hozircha guruh yo`q</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Guruh ochilmaguncha saytdagi «Guruh xaridi» sahifasi bo`sh ko`rinadi.
            </p>
          </div>
        ) : (
          <DataTable columns={columns} data={rows} searchPlaceholder="Mahsulot nomi..." />
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi guruh xaridi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="gb-product">Mahsulot</Label>
              {/*
                Oddiy `select` ishlatilgan: mahsulot ro'yxati uzun bo'lishi
                mumkin va brauzerning o'z qidiruvi shu yerda qulayroq.
              */}
              <select
                id="gb-product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="border-input bg-background mt-1 h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="">— tanlang —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {pickLocalized(p.name)} · {formatMoney(p.basePrice)}
                  </option>
                ))}
              </select>
              {selected ? (
                <p className="text-muted-foreground mt-1 text-xs">
                  Katalog narxi: {formatMoney(selected.basePrice)} — guruh narxi shundan past
                  bo`lishi kerak.
                </p>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="gb-price">Guruh narxi</Label>
                <Input
                  id="gb-price"
                  type="number"
                  inputMode="numeric"
                  value={groupPrice}
                  onChange={(e) => setGroupPrice(e.target.value)}
                  placeholder="890000"
                />
              </div>
              <div>
                <Label htmlFor="gb-size">Odam soni</Label>
                <Input
                  id="gb-size"
                  type="number"
                  inputMode="numeric"
                  value={targetSize}
                  onChange={(e) => setTargetSize(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="gb-days">Muddat (kun)</Label>
                <Input
                  id="gb-days"
                  type="number"
                  inputMode="numeric"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                />
              </div>
            </div>
            {selected && Number(groupPrice) > 0 ? (
              <p className="text-muted-foreground text-xs">
                Chegirma:{' '}
                <span className="font-medium">
                  {Math.max(0, Math.round((1 - Number(groupPrice) / selected.basePrice) * 100))}%
                </span>{' '}
                · {formatNumber(Number(targetSize) || 0)} kishi to`lganda amal qiladi
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Bekor qilish
            </Button>
            <Button onClick={onCreate} disabled={saving || !productId}>
              {saving ? 'Ochilmoqda...' : 'Ochish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
