'use client';

import { COIN_PER_SOM, COIN_VALUE_SOM } from '@ecom/core-domain';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  KpiCard,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from '@ecom/ui';
import { type ColumnDef } from '@tanstack/react-table';
import { Gift, Plus, Tag } from 'lucide-react';
import * as React from 'react';

import { Breadcrumbs } from '../../components/layout/breadcrumbs';
import {
  createPromoCode,
  listPromoCodes,
  type AdminPromoCode,
  type AdminPromoType,
} from '../../lib/auth/client';
import { formatDate, formatMoney, formatNumber } from '../../lib/format';

const TYPE_LABEL: Record<AdminPromoType, string> = {
  PERCENT: 'Foiz',
  FIXED: 'Qat`iy',
  FREE_SHIPPING: 'Tekin yetkazib berish',
};

const promoColumns: ColumnDef<AdminPromoCode>[] = [
  {
    accessorKey: 'code',
    header: 'Kod',
    cell: ({ row }) => (
      <span className="font-mono font-semibold uppercase">{row.original.code}</span>
    ),
  },
  {
    accessorKey: 'type',
    header: 'Turi',
    cell: ({ row }) => (
      <StatusBadge tone="info" dot={false}>
        {TYPE_LABEL[row.original.type]}
      </StatusBadge>
    ),
  },
  {
    accessorKey: 'value',
    header: () => <div className="text-right">Qiymat</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">
        {row.original.type === 'PERCENT'
          ? `${row.original.value}%`
          : row.original.type === 'FIXED'
            ? formatMoney(row.original.value)
            : '—'}
      </div>
    ),
  },
  {
    accessorKey: 'usedCount',
    header: 'Foydalanish',
    cell: ({ row }) => {
      const used = row.original.usedCount;
      const limit = row.original.usageLimit;
      const pct = limit ? Math.min(100, (used / limit) * 100) : 0;
      return (
        <div className="w-32 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span>{formatNumber(used)}</span>
            <span className="text-muted-foreground">{limit ? formatNumber(limit) : '∞'}</span>
          </div>
          {limit ? (
            <div className="bg-muted h-1.5 overflow-hidden rounded-full">
              <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: 'endsAt',
    header: 'Tugaydi',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.endsAt ? formatDate(row.original.endsAt) : 'Cheksiz'}
      </span>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) =>
      row.original.isActive ? (
        <StatusBadge tone="success">Faol</StatusBadge>
      ) : (
        <StatusBadge tone="muted">Faol emas</StatusBadge>
      ),
  },
];

export default function AdminMarketingPage() {
  const [promos, setPromos] = React.useState<AdminPromoCode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [code, setCode] = React.useState('');
  const [type, setType] = React.useState<AdminPromoType>('PERCENT');
  const [value, setValue] = React.useState('');
  const [minOrderTotal, setMinOrderTotal] = React.useState('');
  const [usageLimit, setUsageLimit] = React.useState('');

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await listPromoCodes();
    if (res.success) setPromos(res.data.items);
    else toast({ title: res.error.message, variant: 'destructive' });
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const activePromos = promos.filter((p) => p.isActive).length;
  const totalRedeemed = promos.reduce((s, p) => s + p.usedCount, 0);

  const numOrNull = (raw: string) => {
    const n = Number(raw);
    return raw.trim() && Number.isFinite(n) ? n : null;
  };

  const onCreate = async () => {
    if (saving) return;
    const parsedValue = Number(value);
    if (type !== 'FREE_SHIPPING' && (!value.trim() || !Number.isFinite(parsedValue))) {
      toast({ title: 'Qiymatni kiriting', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const res = await createPromoCode({
      code: code.trim(),
      type,
      value: type === 'FREE_SHIPPING' ? 0 : parsedValue,
      minOrderTotal: numOrNull(minOrderTotal),
      usageLimit: numOrNull(usageLimit),
    });
    setSaving(false);
    if (!res.success) {
      toast({ title: res.error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `«${res.data.promo.code}» yaratildi`, variant: 'success' });
    setOpen(false);
    setCode('');
    setValue('');
    setMinOrderTotal('');
    setUsageLimit('');
    await load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<Breadcrumbs />}
        title="Marketing"
        description="Promokodlar va sodiqlik dasturi"
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Yangi promokod
          </Button>
        }
      />

      {/*
        "Push ulashi (CTR) 14.2%" va "Email ochilishi 32.7%" olib tashlandi —
        bazada push/email yuborish statistikasi umuman yozilmaydi, bu sonlar
        kodga qo'lda yozilgan edi.
      */}
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard
          label="Faol promokodlar"
          value={formatNumber(activePromos)}
          icon={Tag}
          accent="primary"
        />
        <KpiCard
          label="Jami foydalanish"
          value={formatNumber(totalRedeemed)}
          icon={Gift}
          accent="success"
        />
      </div>

      <Tabs defaultValue="promos">
        <TabsList>
          <TabsTrigger value="promos">
            <Tag className="mr-1 h-3.5 w-3.5" /> Promo-kodlar
          </TabsTrigger>
          <TabsTrigger value="loyalty">
            <Gift className="mr-1 h-3.5 w-3.5" /> Sodiqlik
          </TabsTrigger>
        </TabsList>
        {/*
          "Kampaniyalar" va "Segmentlar" tablari olib tashlandi: bazada
          Campaign va Segment modellari yo'q, ular butunlay to'qima ro'yxat
          edi (Navro'z 2026, Black Friday, VIP 245 kishi...).
        */}

        <TabsContent value="promos">
          <Card className="p-1">
            {loading ? (
              <div className="text-muted-foreground p-10 text-center text-sm">Yuklanmoqda...</div>
            ) : promos.length === 0 ? (
              <div className="text-muted-foreground p-10 text-center text-sm">
                Hozircha promokod yo`q. «Yangi promokod» tugmasi bilan yarating.
              </div>
            ) : (
              <DataTable
                columns={promoColumns}
                data={promos}
                searchPlaceholder="Kod yoki turi..."
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="loyalty">
          <Card>
            <CardHeader>
              <CardTitle>Sodiqlik dasturi (Sello Coins)</CardTitle>
              <p className="text-muted-foreground text-xs">
                Qoidalar <span className="font-mono">@ecom/core-domain</span> dan olinadi — bu yerda
                ko`rsatilgani kod bilan bir xil.
              </p>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {/*
                Ilgari bu yerda "Har 10 000 UZS — 100 ball" deb yozilgan edi,
                bu esa HAQIQIY qoidaga MOS EMAS (1 000 so'mga 1 coin). Admin
                shu matnga qarab mijozga noto'g'ri ma'lumot berishi mumkin edi.
              */}
              <div className="rounded-md border p-4">
                <div className="text-muted-foreground text-xs">Ishlab olish</div>
                <div className="text-2xl font-bold">{formatMoney(1 / COIN_PER_SOM)} = 1 coin</div>
                <div className="text-muted-foreground mt-1 text-xs">
                  ≈ {Math.round(COIN_PER_SOM * COIN_VALUE_SOM * 100)}% cashback
                </div>
              </div>
              <div className="rounded-md border p-4">
                <div className="text-muted-foreground text-xs">Ishlatish qiymati</div>
                <div className="text-2xl font-bold">1 coin = {formatMoney(COIN_VALUE_SOM)}</div>
                <div className="text-muted-foreground mt-1 text-xs">Keyingi xaridda chegirma</div>
              </div>
              <div className="rounded-md border p-4">
                <div className="text-muted-foreground text-xs">Kunlik kirish bonusi</div>
                <div className="text-2xl font-bold">+5 coin</div>
                <div className="text-muted-foreground mt-1 text-xs">Kuniga bir marta</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi promokod</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="promo-code">Kod</Label>
              <Input
                id="promo-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="WELCOME10"
                className="font-mono uppercase"
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="promo-type">Turi</Label>
              <Select value={type} onValueChange={(v) => setType(v as AdminPromoType)}>
                <SelectTrigger id="promo-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENT">Foiz (%)</SelectItem>
                  <SelectItem value="FIXED">Qat`iy summa</SelectItem>
                  <SelectItem value="FREE_SHIPPING">Tekin yetkazib berish</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {type !== 'FREE_SHIPPING' ? (
              <div>
                <Label htmlFor="promo-value">
                  {type === 'PERCENT' ? 'Chegirma foizi' : 'Chegirma summasi (so`m)'}
                </Label>
                <Input
                  id="promo-value"
                  type="number"
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === 'PERCENT' ? '10' : '50000'}
                />
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="promo-min">Minimal summa (ixtiyoriy)</Label>
                <Input
                  id="promo-min"
                  type="number"
                  inputMode="numeric"
                  value={minOrderTotal}
                  onChange={(e) => setMinOrderTotal(e.target.value)}
                  placeholder="200000"
                />
              </div>
              <div>
                <Label htmlFor="promo-limit">Umumiy limit (ixtiyoriy)</Label>
                <Input
                  id="promo-limit"
                  type="number"
                  inputMode="numeric"
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(e.target.value)}
                  placeholder="100"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Bekor qilish
            </Button>
            <Button onClick={onCreate} disabled={saving || code.trim().length < 3}>
              {saving ? 'Saqlanmoqda...' : 'Yaratish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
