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
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { Plus } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { createBrand, listBrands, type AdminBrand } from '../../lib/auth/client';
import { formatNumber } from '../../lib/format';

const columns: ColumnDef<AdminBrand>[] = [
  {
    accessorKey: 'name',
    header: 'Brend',
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <div className="bg-muted grid h-9 w-9 place-items-center rounded-md text-xs font-bold">
          {row.original.name[0]}
        </div>
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-muted-foreground text-xs">/{row.original.slug}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'productsCount',
    header: () => <div className="text-right">Mahsulot</div>,
    cell: ({ row }) => <div className="text-right">{formatNumber(row.original.productsCount)}</div>,
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) =>
      row.original.isActive ? (
        <StatusBadge tone="success">Faol</StatusBadge>
      ) : (
        <StatusBadge tone="muted">Yashirin</StatusBadge>
      ),
  },
  // Ilgari bu yerda handler'siz `Switch` turardi — bosilganda hech nima
  // bo'lmasdi. Brendni yoqish/o'chirish API'si yozilgunicha ustun yo'q.
];

export default function AdminBrandsPage() {
  const [brands, setBrands] = React.useState<AdminBrand[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState('');
  const [logoUrl, setLogoUrl] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listBrands();
    if (res.success) setBrands(res.data.items);
    else toast({ title: res.error.message, variant: 'destructive' });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onCreate = async () => {
    if (saving || name.trim().length < 2) return;
    setSaving(true);
    const res = await createBrand({
      name: name.trim(),
      logoUrl: logoUrl.trim() || null,
    });
    setSaving(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `«${res.data.brand.name}» qo\`shildi`, variant: 'success' });
    setOpen(false);
    setName('');
    setLogoUrl('');
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Brendlar"
        description="Brend katalogi va ularning ko`rinishi"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Yangi brend
          </Button>
        }
      />

      <Card className="p-1">
        {loading ? (
          <div className="text-muted-foreground p-10 text-center text-sm">Yuklanmoqda...</div>
        ) : brands.length === 0 ? (
          <div className="text-muted-foreground p-10 text-center text-sm">
            Hozircha brend yo`q. «Yangi brend» tugmasi bilan qo`shing.
          </div>
        ) : (
          <DataTable columns={columns} data={brands} searchPlaceholder="Brend nomi..." />
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi brend</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="brand-name">Nomi</Label>
              <Input
                id="brand-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masalan: Nike"
                autoComplete="off"
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Slug nomdan avtomatik hosil qilinadi.
              </p>
            </div>
            <div>
              <Label htmlFor="brand-logo">Logo manzili (ixtiyoriy)</Label>
              <Input
                id="brand-logo"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                autoComplete="off"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Bekor qilish
            </Button>
            <Button onClick={onCreate} disabled={saving || name.trim().length < 2}>
              {saving ? 'Saqlanmoqda...' : 'Qo`shish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
