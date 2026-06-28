'use client';

import {
  Button,
  Card,
  Checkbox,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Archive,
  Copy,
  Filter,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { ProductStatusBadge } from '../../components/status/product-status-badge';
import { listProducts, type AdminProduct } from '@/lib/auth/client';
import { formatMoney, formatNumber, pickLocalized } from '../../lib/format';

export default function AdminProductsPage() {
  const [products, setProducts] = React.useState<AdminProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState<string>('all');
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [brandFilter, setBrandFilter] = React.useState<string>('all');
  const [selection, setSelection] = React.useState<Record<string, boolean>>({});

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listProducts();
    if (res.success) setProducts(res.data.items);
    else toast({ title: res.error.message, variant: 'destructive' });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Filtr variantlari — yuklangan mahsulotlardan
  const brandOptions = React.useMemo(
    () => Array.from(new Set(products.map((p) => p.brandName).filter((b) => b && b !== '—'))),
    [products],
  );
  const categoryOptions = React.useMemo(
    () => Array.from(new Set(products.map((p) => p.categoryName.uz).filter((c) => c && c !== '—'))),
    [products],
  );

  const data = React.useMemo(() => {
    return products.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && p.categoryName.uz !== categoryFilter) return false;
      if (brandFilter !== 'all' && p.brandName !== brandFilter) return false;
      return true;
    });
  }, [products, statusFilter, categoryFilter, brandFilter]);

  const columns: ColumnDef<AdminProduct>[] = React.useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
            aria-label="Hammasini tanlash"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Tanlash"
          />
        ),
        enableSorting: false,
      },
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
              <Link
                href={`/products/${row.original.id}`}
                className="block truncate font-medium hover:underline"
              >
                {pickLocalized(row.original.name)}
              </Link>
              <div className="truncate text-xs text-muted-foreground">{row.original.sku}</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <ProductStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'brandName',
        header: 'Brend',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">{row.original.brandName}</span>
        ),
      },
      {
        accessorKey: 'categoryName',
        header: 'Kategoriya',
        cell: ({ row }) => <span className="text-sm">{pickLocalized(row.original.categoryName)}</span>,
      },
      {
        accessorKey: 'basePrice',
        header: () => <div className="text-right">Narx</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <div className="font-medium">{formatMoney(row.original.basePrice)}</div>
            {row.original.compareAtPrice ? (
              <div className="text-xs text-muted-foreground line-through">
                {formatMoney(row.original.compareAtPrice)}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'stock',
        header: () => <div className="text-right">Stok</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <span
              className={
                row.original.stock === 0
                  ? 'text-red-600'
                  : row.original.stock <= 10
                    ? 'text-amber-600'
                    : ''
              }
            >
              {formatNumber(row.original.stock)}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'soldCount',
        header: () => <div className="text-right">Sotilgan</div>,
        cell: ({ row }) => (
          <div className="text-right text-sm">{formatNumber(row.original.soldCount)}</div>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Amallar</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href={`/products/${row.original.id}`}>
                    <Pencil className="mr-2 h-4 w-4" /> Tahrirlash
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    void navigator.clipboard?.writeText(row.original.sku);
                    toast({ title: 'SKU nusxalandi', variant: 'success' });
                  }}
                >
                  <Copy className="mr-2 h-4 w-4" /> SKU nusxalash
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Archive className="mr-2 h-4 w-4" /> Arxivlash
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" /> O`chirish
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        enableSorting: false,
      },
    ],
    [],
  );

  const selectedCount = Object.keys(selection).length;

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Mahsulotlar"
        description={`Jami ${formatNumber(products.length)} ta mahsulot katalogda`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              Yangilash
            </Button>
            <Button asChild size="sm">
              <Link href="/products/new">
                <Plus className="mr-2 h-4 w-4" /> Yangi mahsulot
              </Link>
            </Button>
          </>
        }
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha statuslar</SelectItem>
              <SelectItem value="ACTIVE">Faol</SelectItem>
              <SelectItem value="DRAFT">Qoralama</SelectItem>
              <SelectItem value="PENDING_REVIEW">Tekshiruvda</SelectItem>
              <SelectItem value="ARCHIVED">Arxivlangan</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Tugagan</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Kategoriya" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha kategoriyalar</SelectItem>
              {categoryOptions.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="h-9 w-[160px]">
              <SelectValue placeholder="Brend" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Barcha brendlar</SelectItem>
              {brandOptions.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(statusFilter !== 'all' || categoryFilter !== 'all' || brandFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter('all');
                setCategoryFilter('all');
                setBrandFilter('all');
              }}
            >
              Tozalash
            </Button>
          )}
          <div className="ml-auto text-xs text-muted-foreground">
            {data.length} / {products.length}
          </div>
        </div>
      </Card>

      {selectedCount > 0 ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="text-sm">
            <span className="font-medium">{selectedCount}</span> ta mahsulot tanlandi
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Archive className="mr-2 h-4 w-4" /> Arxivga
            </Button>
            <Button variant="outline" size="sm">
              Status o`zgartirish
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" /> O`chirish
            </Button>
          </div>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          searchPlaceholder="Nomi yoki SKU bo`yicha qidirish..."
          rowSelection={selection}
          onRowSelectionChange={setSelection}
          emptyState={
            <EmptyState
              icon={Package}
              title="Mahsulot topilmadi"
              description="Filtrlarni o`zgartiring yoki yangi mahsulot qo`shing"
              action={
                <Button asChild size="sm">
                  <Link href="/products/new">
                    <Plus className="mr-2 h-4 w-4" /> Yangi mahsulot
                  </Link>
                </Button>
              }
            />
          }
        />
      )}
    </div>
  );
}
