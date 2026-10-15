'use client';

import {
  Button,
  Card,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  KpiCard,
  Label,
  PageHeader,
  Skeleton,
  Tabs,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { Archive, MoreHorizontal, Package, Pencil, Plus, Send } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { SellerProductStatusBadge } from '../../components/product-status-badge';
import {
  SpecsEditor,
  specsPayload,
  specsToRows,
  type SpecRow,
} from '../../components/products/specs-editor';
import { formatMoney, formatNumber, pickLocalized } from '../../lib/format';

type LocalizedText = { uz: string; ru?: string; en?: string };

interface ProductRow {
  id: string;
  slug: string;
  sku: string;
  name: LocalizedText;
  description: LocalizedText | null;
  specs?: { key?: string; label?: string; value: string }[];
  status: 'DRAFT' | 'PENDING_REVIEW' | 'ACTIVE' | 'ARCHIVED' | 'OUT_OF_STOCK';
  basePrice: number;
  compareAtPrice: number | null;
  /** Admin rad etgan yoki sotuvdan olgan bo'lsa — sababi. */
  moderationNote: { action: 'reject' | 'takedown'; reason: string } | null;
  /** FBS — o'zingiz qadoqlab olib kelasiz; FBO — tovar omborimizda (ADR 0015). */
  fulfillmentModel: 'FBS' | 'FBO';
  rating: number;
  reviewCount: number;
  soldCount: number;
  stock: number;
  imageUrl: string;
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

type RowAction = 'edit' | 'archive' | 'resubmit';

function buildColumns(onAction: (p: ProductRow, a: RowAction) => void): ColumnDef<ProductRow>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Mahsulot',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="bg-muted h-10 w-10 shrink-0 overflow-hidden rounded-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={row.original.imageUrl} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-medium">{pickLocalized(row.original.name)}</div>
            <div className="text-muted-foreground truncate text-xs">{row.original.sku}</div>
            {row.original.moderationNote ? (
              <div className="mt-0.5 text-xs text-red-600">
                {row.original.moderationNote.action === 'reject'
                  ? 'Rad etildi'
                  : 'Admin sotuvdan oldi'}
                : {row.original.moderationNote.reason}
              </div>
            ) : null}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <SellerProductStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'fulfillmentModel',
      header: 'Model',
      cell: ({ row }) => (
        <span
          className="text-muted-foreground text-xs"
          title={
            row.original.fulfillmentModel === 'FBO'
              ? 'Tovar omborimizda — biz yig‘amiz va qadoqlaymiz'
              : 'Buyurtmani o‘zingiz qadoqlab omborga olib kelasiz'
          }
        >
          {row.original.fulfillmentModel}
        </span>
      ),
    },
    {
      accessorKey: 'basePrice',
      header: () => <div className="text-right">Narx</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">{formatMoney(row.original.basePrice)}</div>
      ),
    },
    {
      accessorKey: 'stock',
      header: () => <div className="text-right">Stok</div>,
      cell: ({ row }) => (
        <div
          className={
            row.original.stock === 0
              ? 'text-right text-red-600'
              : row.original.stock <= 10
                ? 'text-right text-amber-600'
                : 'text-right'
          }
        >
          {formatNumber(row.original.stock)}
        </div>
      ),
    },
    {
      accessorKey: 'soldCount',
      header: () => <div className="text-right">Sotilgan</div>,
      cell: ({ row }) => <div className="text-right">{formatNumber(row.original.soldCount)}</div>,
    },
    {
      accessorKey: 'rating',
      header: () => <div className="text-right">Reyting</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <span>⭐ {row.original.rating}</span>
          <span className="text-muted-foreground ml-1 text-xs">({row.original.reviewCount})</span>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original;
        const canEdit = p.status !== 'ARCHIVED';
        const canResubmit = p.status === 'DRAFT' || p.status === 'ARCHIVED';
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Amallar">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit ? (
                  <DropdownMenuItem onClick={() => onAction(p, 'edit')}>
                    <Pencil className="mr-2 h-4 w-4" /> Tahrirlash
                  </DropdownMenuItem>
                ) : null}
                {canResubmit ? (
                  <DropdownMenuItem onClick={() => onAction(p, 'resubmit')}>
                    <Send className="mr-2 h-4 w-4" /> Tekshiruvga yuborish
                  </DropdownMenuItem>
                ) : null}
                {canEdit ? (
                  <DropdownMenuItem className="text-red-600" onClick={() => onAction(p, 'archive')}>
                    <Archive className="mr-2 h-4 w-4" /> Sotuvdan olish (arxiv)
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}

interface EditForm {
  nameUz: string;
  descriptionUz: string;
  basePrice: string;
  compareAtPrice: string;
}

type ProductMutation = ApiResult<{ product: { status: string }; sentToReview?: boolean }>;

async function callProductApi(
  id: string,
  method: 'PATCH' | 'POST',
  body: unknown,
): Promise<ProductMutation> {
  try {
    const res = await fetch(`/api/products/${id}`, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return (await res.json()) as ProductMutation;
  } catch {
    return { success: false, error: { message: 'Tarmoq xatosi' } };
  }
}

export default function SellerProductsPage() {
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState('all');
  const [editing, setEditing] = React.useState<ProductRow | null>(null);
  const [form, setForm] = React.useState<EditForm>({
    nameUz: '',
    descriptionUz: '',
    basePrice: '',
    compareAtPrice: '',
  });
  const [specs, setSpecs] = React.useState<SpecRow[]>([]);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products', { credentials: 'same-origin' });
      const json = (await res.json()) as ApiResult<{ items: ProductRow[] }>;
      if (json.success && json.data) setProducts(json.data.items);
      else toast({ title: json.error?.message ?? 'Xato', variant: 'destructive' });
    } catch {
      toast({ title: 'Tarmoq xatosi', variant: 'destructive' });
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onAction = React.useCallback(
    async (p: ProductRow, action: RowAction) => {
      if (action === 'edit') {
        setForm({
          nameUz: p.name.uz ?? '',
          descriptionUz: p.description?.uz ?? '',
          basePrice: String(p.basePrice),
          compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : '',
        });
        setSpecs(specsToRows(p.specs));
        setEditing(p);
        return;
      }
      if (
        action === 'archive' &&
        !confirm(`«${pickLocalized(p.name)}» sotuvdan olinsinmi? Keyin qayta yuborishingiz mumkin.`)
      ) {
        return;
      }
      const json = await callProductApi(p.id, 'POST', { action });
      if (!json.success) {
        toast({ title: json.error?.message ?? 'Xato', variant: 'destructive' });
        return;
      }
      toast({
        title: action === 'archive' ? 'Sotuvdan olindi' : 'Tekshiruvga yuborildi',
        description: action === 'archive' ? 'Tovar arxivda' : 'Admin tasdiqlagach sotuvga chiqadi',
        variant: 'success',
      });
      void load();
    },
    [load],
  );
  const columns = React.useMemo(() => buildColumns((p, a) => void onAction(p, a)), [onAction]);

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const json = await callProductApi(editing.id, 'PATCH', {
      nameUz: form.nameUz.trim(),
      descriptionUz: form.descriptionUz.trim(),
      basePrice: form.basePrice.trim(),
      compareAtPrice: form.compareAtPrice.trim() || null,
      specs: specsPayload(specs),
    });
    setSaving(false);
    if (!json.success) {
      toast({ title: json.error?.message ?? 'Xato', variant: 'destructive' });
      return;
    }
    toast({
      title: 'Saqlandi',
      description: json.data?.sentToReview
        ? 'Matn o‘zgargani uchun tovar qayta tekshiruvga yuborildi'
        : undefined,
      variant: 'success',
    });
    setEditing(null);
    void load();
  };

  const filtered = React.useMemo(() => {
    if (tab === 'active') return products.filter((p) => p.status === 'ACTIVE');
    if (tab === 'draft') return products.filter((p) => p.status === 'DRAFT');
    if (tab === 'review') return products.filter((p) => p.status === 'PENDING_REVIEW');
    if (tab === 'archived')
      return products.filter((p) => p.status === 'ARCHIVED' || p.status === 'OUT_OF_STOCK');
    return products;
  }, [tab, products]);

  const counts = {
    all: products.length,
    active: products.filter((p) => p.status === 'ACTIVE').length,
    draft: products.filter((p) => p.status === 'DRAFT').length,
    review: products.filter((p) => p.status === 'PENDING_REVIEW').length,
    archived: products.filter((p) => p.status === 'ARCHIVED' || p.status === 'OUT_OF_STOCK').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mahsulotlarim"
        description="Faqat sizning do`koningizdagi mahsulotlar"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              Yangilash
            </Button>
            <Button size="sm" asChild>
              <Link href="/products/new">
                <Plus className="mr-2 h-4 w-4" /> Yangi mahsulot
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Jami" value={formatNumber(counts.all)} icon={Package} accent="primary" />
        <KpiCard label="Faol" value={formatNumber(counts.active)} accent="success" />
        <KpiCard label="Tekshiruvda" value={formatNumber(counts.review)} accent="warning" />
        <KpiCard label="Qoralama" value={formatNumber(counts.draft)} accent="info" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Barchasi ({counts.all})</TabsTrigger>
          <TabsTrigger value="active">Faol ({counts.active})</TabsTrigger>
          <TabsTrigger value="draft">Qoralama ({counts.draft})</TabsTrigger>
          <TabsTrigger value="review">Tekshiruvda ({counts.review})</TabsTrigger>
          <TabsTrigger value="archived">Arxiv ({counts.archived})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <Card className="p-1">
          <DataTable
            columns={columns}
            data={filtered}
            searchPlaceholder="Mahsulot nomi yoki SKU..."
            emptyState={
              <EmptyState
                icon={Package}
                title="Mahsulot yo`q"
                description="Birinchi mahsulotingizni qo`shing"
              />
            }
          />
        </Card>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => (open ? null : setEditing(null))}>
        {/* Xususiyatlar qo'shilgach forma uzun — dialog o'zi suriladi. */}
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <form onSubmit={saveEdit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Tovarni tahrirlash</DialogTitle>
              <DialogDescription>
                Narx o‘zgarishi darhol kuchga kiradi. Nom, tavsif yoki xususiyatlar o‘zgarsa,
                sotuvdagi tovar qayta tekshiruvga yuboriladi.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1">
              <Label htmlFor="edit-name">Nomi (uz)</Label>
              <Input
                id="edit-name"
                value={form.nameUz}
                onChange={(e) => setForm({ ...form, nameUz: e.target.value })}
                minLength={2}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-desc">Tavsif (uz)</Label>
              <Textarea
                id="edit-desc"
                rows={4}
                value={form.descriptionUz}
                onChange={(e) => setForm({ ...form, descriptionUz: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="edit-price">Narx (so‘m)</Label>
                <Input
                  id="edit-price"
                  inputMode="decimal"
                  value={form.basePrice}
                  onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-compare">Eski narx (ixtiyoriy)</Label>
                <Input
                  id="edit-compare"
                  inputMode="decimal"
                  value={form.compareAtPrice}
                  onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Xususiyatlar</Label>
              <SpecsEditor value={specs} onChange={setSpecs} idPrefix="edit-spec" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Bekor
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saqlanmoqda…' : 'Saqlash'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
