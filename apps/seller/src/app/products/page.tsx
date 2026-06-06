'use client';

import {
  Button,
  Card,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  KpiCard,
  PageHeader,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import {
  ArrowDownToLine,
  Archive,
  Copy,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { SellerProductStatusBadge } from '../../components/product-status-badge';
import { formatMoney, formatNumber, pickLocalized } from '../../lib/format';
import { sellerProducts, type SellerProduct } from '../../lib/mock';

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
          <Link href={`/products/${row.original.id}`} className="block truncate font-medium hover:underline">
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
    cell: ({ row }) => <SellerProductStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'basePrice',
    header: () => <div className="text-right">Narx</div>,
    cell: ({ row }) => <div className="text-right font-medium">{formatMoney(row.original.basePrice)}</div>,
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
        <span className="ml-1 text-xs text-muted-foreground">({row.original.reviewCount})</span>
      </div>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/products/${row.original.id}`}>
                <Pencil className="mr-2 h-4 w-4" /> Tahrirlash
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="mr-2 h-4 w-4" /> Nusxalash
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Archive className="mr-2 h-4 w-4" /> Arxiv
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    ),
  },
];

export default function SellerProductsPage() {
  const [tab, setTab] = React.useState('all');
  const filtered = React.useMemo(() => {
    if (tab === 'all') return sellerProducts;
    if (tab === 'active') return sellerProducts.filter((p) => p.status === 'ACTIVE');
    if (tab === 'draft') return sellerProducts.filter((p) => p.status === 'DRAFT');
    if (tab === 'review') return sellerProducts.filter((p) => p.status === 'PENDING_REVIEW');
    if (tab === 'archived') return sellerProducts.filter((p) => p.status === 'ARCHIVED' || p.status === 'OUT_OF_STOCK');
    return sellerProducts;
  }, [tab]);

  const counts = {
    all: sellerProducts.length,
    active: sellerProducts.filter((p) => p.status === 'ACTIVE').length,
    draft: sellerProducts.filter((p) => p.status === 'DRAFT').length,
    review: sellerProducts.filter((p) => p.status === 'PENDING_REVIEW').length,
    archived: sellerProducts.filter((p) => p.status === 'ARCHIVED' || p.status === 'OUT_OF_STOCK').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mahsulotlarim"
        description="Faqat sizning do`koningizdagi mahsulotlar"
        actions={
          <>
            <Button variant="outline" size="sm">
              <ArrowDownToLine className="mr-2 h-4 w-4" /> Import
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

      <Card className="p-1">
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Mahsulot nomi yoki SKU..."
          emptyState={<EmptyState icon={Package} title="Mahsulot yo`q" />}
        />
      </Card>
    </div>
  );
}
