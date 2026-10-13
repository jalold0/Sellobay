'use client';

import {
  Avatar,
  AvatarFallback,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  EmptyState,
  KpiCard,
  PageHeader,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { Check, Store, X } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import { SellerStatusBadge } from '../../components/status/seller-status-badge';
import {
  approveSeller,
  listSellers,
  rejectSeller,
  setSellerFulfillment,
  setSellerStatus,
  type AdminSeller,
} from '@/lib/auth/client';
import { formatDate, formatMoney, formatNumber, initials } from '../../lib/format';

export default function AdminSellersPage() {
  const [tab, setTab] = React.useState('all');
  const [sellers, setSellers] = React.useState<AdminSeller[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listSellers('all');
    if (res.success) setSellers(res.data.items);
    else toast({ title: res.error.message, variant: 'destructive' });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onApprove = React.useCallback(async (s: AdminSeller) => {
    setBusyId(s.id);
    const res = await approveSeller(s.id);
    setBusyId(null);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${s.brandName} tasdiqlandi`, variant: 'success' });
    setSellers((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: 'ACTIVE' } : x)));
  }, []);

  const onReject = React.useCallback(async (s: AdminSeller) => {
    const reason = window.prompt(`${s.brandName} — rad etish sababi (sotuvchiga ko‘rsatiladi):`);
    if (reason === null) return;
    if (reason.trim().length < 3) {
      toast({ title: 'Sababni yozing', variant: 'destructive' });
      return;
    }
    setBusyId(s.id);
    const res = await rejectSeller(s.id, reason.trim());
    setBusyId(null);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${s.brandName} rad etildi`, variant: 'destructive' });
    setSellers((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: 'BLOCKED' } : x)));
  }, []);

  // To'xtatilgan sotuvchining tovarlari vitrinadan darhol yo'qoladi.
  const onToggle = React.useCallback(async (s: AdminSeller) => {
    const suspend = s.status === 'ACTIVE';
    let reason: string | undefined;
    if (suspend) {
      const r = window.prompt(`${s.brandName} — to‘xtatish sababi:`);
      if (r === null) return;
      if (r.trim().length < 3) {
        toast({ title: 'Sababni yozing', variant: 'destructive' });
        return;
      }
      reason = r.trim();
    } else if (!confirm(`${s.brandName} qayta faollashtirilsinmi?`)) {
      return;
    }
    setBusyId(s.id);
    const res = await setSellerStatus(s.id, suspend ? 'suspend' : 'reactivate', reason);
    setBusyId(null);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: suspend ? `${s.brandName} to‘xtatildi` : `${s.brandName} faollashtirildi`,
      description: suspend ? 'Tovarlari vitrinadan olindi' : 'Tovarlari yana sotuvda',
      variant: suspend ? 'destructive' : 'success',
    });
    setSellers((prev) =>
      prev.map((x) => (x.id === s.id ? { ...x, status: suspend ? 'SUSPENDED' : 'ACTIVE' } : x)),
    );
  }, []);

  // FBS ↔ FBO. FBO — tovar omborimizda: avval tovar topshiriladi, keyin shu yerda o'tkaziladi.
  const onModel = React.useCallback(async (s: AdminSeller) => {
    const next = s.fulfillmentModel === 'FBS' ? 'FBO' : 'FBS';
    const explain =
      next === 'FBO'
        ? 'Tovarlarini bizning ombor yig‘adi va qadoqlaydi, zaxirasini ombor yuritadi.'
        : 'Har buyurtmani sotuvchi o‘zi qadoqlab, muddatigacha omborga olib keladi.';
    if (!confirm(`${s.brandName} — ${next} modeliga o‘tkazilsinmi?\n\n${explain}`)) return;
    const others = s.productsByModel[s.fulfillmentModel === 'FBS' ? 'FBS' : 'FBO'];
    const applyToProducts =
      others > 0 &&
      confirm(
        `Mavjud ${others} ta tovari ham ${next} bo‘lsinmi?\n\n«Bekor qilish» — faqat yangi tovarlar ${next} bo‘ladi.`,
      );
    setBusyId(s.id);
    const res = await setSellerFulfillment(s.id, next, applyToProducts);
    setBusyId(null);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({
      title: `${s.brandName} — ${next}`,
      description:
        res.data.productsMoved > 0
          ? `${res.data.productsMoved} ta tovar ${next} ga o‘tkazildi`
          : 'Yangi tovarlar shu model bilan yaratiladi',
      variant: 'success',
    });
    setSellers((prev) =>
      prev.map((x) =>
        x.id === s.id
          ? {
              ...x,
              fulfillmentModel: next,
              productsByModel: applyToProducts
                ? { FBS: 0, FBO: 0, [next]: x.productsByModel.FBS + x.productsByModel.FBO }
                : x.productsByModel,
            }
          : x,
      ),
    );
  }, []);

  const columns = React.useMemo<ColumnDef<AdminSeller>[]>(
    () => [
      {
        accessorKey: 'brandName',
        header: 'Do`kon',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-[10px]">
                {initials(row.original.brandName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium">{row.original.brandName}</div>
              <div className="text-muted-foreground truncate text-xs">{row.original.legalName}</div>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'ownerName',
        header: 'Egasi',
        cell: ({ row }) => (
          <div className="text-sm">
            <div>{row.original.ownerName}</div>
            <div className="text-muted-foreground text-xs">{row.original.phone}</div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <SellerStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'commissionRate',
        header: () => <div className="text-right">Komissiya</div>,
        cell: ({ row }) => (
          <div className="text-right">{row.original.commissionRate.toFixed(1)}%</div>
        ),
      },
      {
        accessorKey: 'fulfillmentModel',
        header: 'Model',
        cell: ({ row }) => {
          const s = row.original;
          const mixed = s.productsByModel.FBS > 0 && s.productsByModel.FBO > 0;
          return (
            <div className="space-y-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 font-semibold"
                disabled={busyId === s.id}
                title="FBS ↔ FBO o‘tkazish"
                onClick={() => void onModel(s)}
              >
                {s.fulfillmentModel}
              </Button>
              {mixed ? (
                <div className="text-muted-foreground text-[11px]">
                  {s.productsByModel.FBS} FBS, {s.productsByModel.FBO} FBO
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: 'productsCount',
        header: () => <div className="text-right">Mahsulot</div>,
        cell: ({ row }) => (
          <div className="text-right">{formatNumber(row.original.productsCount)}</div>
        ),
      },
      {
        accessorKey: 'totalRevenue',
        header: () => <div className="text-right">Aylanma</div>,
        cell: ({ row }) => (
          <div className="text-right font-semibold">{formatMoney(row.original.totalRevenue)}</div>
        ),
      },
      {
        accessorKey: 'appliedAt',
        header: 'Murojaat',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs">
            {formatDate(new Date(row.original.appliedAt))}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const s = row.original;
          const busy = busyId === s.id;
          if (s.status === 'PENDING') {
            return (
              <div className="flex justify-end gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  onClick={() => void onApprove(s)}
                >
                  <Check className="mr-1 h-3 w-3" /> Tasdiqlash
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  className="h-8 border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => void onReject(s)}
                >
                  <X className="mr-1 h-3 w-3" /> Rad
                </Button>
              </div>
            );
          }
          if (s.status === 'ACTIVE' || s.status === 'SUSPENDED') {
            return (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  className="h-8"
                  onClick={() => void onToggle(s)}
                >
                  {s.status === 'ACTIVE' ? 'To‘xtatish' : 'Faollashtirish'}
                </Button>
              </div>
            );
          }
          return null;
        },
        enableSorting: false,
      },
    ],
    [busyId, onApprove, onReject, onToggle, onModel],
  );

  const filtered = React.useMemo(() => {
    if (tab === 'pending') return sellers.filter((s) => s.status === 'PENDING');
    if (tab === 'active') return sellers.filter((s) => s.status === 'ACTIVE');
    if (tab === 'inactive')
      return sellers.filter((s) => s.status === 'SUSPENDED' || s.status === 'BLOCKED');
    return sellers;
  }, [tab, sellers]);

  const pending = sellers.filter((s) => s.status === 'PENDING').length;
  const active = sellers.filter((s) => s.status === 'ACTIVE').length;
  const totalRevenue = sellers.reduce((sum, x) => sum + x.totalRevenue, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Sotuvchilar"
        description="Marketplace sotuvchilarini boshqarish"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            Yangilash
          </Button>
        }
      />

      {pending > 0 ? (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-amber-800 dark:text-amber-200">
              {pending} ta sotuvchi tasdiqlash kutilmoqda
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-amber-700 dark:text-amber-300">
            Tasdiqlanmagan murojaatlarni &quot;Tekshiruvda&quot; tabidan ko`ring.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Jami" value={formatNumber(sellers.length)} icon={Store} accent="primary" />
        <KpiCard label="Faol" value={formatNumber(active)} accent="success" />
        <KpiCard label="Tekshiruvda" value={formatNumber(pending)} accent="warning" />
        <KpiCard label="Umumiy aylanma" value={formatMoney(totalRevenue)} accent="info" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">Barchasi ({sellers.length})</TabsTrigger>
          <TabsTrigger value="pending">Tekshiruvda ({pending})</TabsTrigger>
          <TabsTrigger value="active">Faol ({active})</TabsTrigger>
          <TabsTrigger value="inactive">Bloklangan/To`xtatilgan</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
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
                searchPlaceholder="Brend, egasi yoki STIR..."
                emptyState={<EmptyState icon={Store} title="Sotuvchi topilmadi" />}
              />
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
