'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  PageHeader,
  Skeleton,
  toast,
} from '@ecom/ui';
import { Phone, RefreshCw, ShoppingCart, Truck } from 'lucide-react';
import * as React from 'react';

import { formatDateTime, formatMoney } from '../../lib/format';

interface OrderItem {
  id: string;
  sku: string;
  name: { uz?: string; ru?: string; en?: string } | string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface Order {
  id: string;
  number: string;
  status: string;
  placedAt: string;
  deliveryMethod: string;
  customer: { name: string; phone: string | null };
  address: string | null;
  sellerSubtotal: string;
  itemCount: number;
  items: OrderItem[];
}

interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: { message: string };
}

const STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-indigo-100 text-indigo-800',
  PACKED: 'bg-indigo-100 text-indigo-800',
  SHIPPED: 'bg-violet-100 text-violet-800',
  OUT_FOR_DELIVERY: 'bg-violet-100 text-violet-800',
  DELIVERED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
  RETURNED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-red-100 text-red-800',
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Kutilmoqda',
  CONFIRMED: 'Tasdiqlandi',
  PAID: "To'landi",
  PROCESSING: 'Tayyorlanmoqda',
  PACKED: 'Qadoqlandi',
  SHIPPED: "Jo'natildi",
  OUT_FOR_DELIVERY: 'Yetkazilmoqda',
  DELIVERED: 'Yetkazildi',
  CANCELLED: 'Bekor qilindi',
  RETURNED: 'Qaytarildi',
  REFUNDED: 'Pul qaytarildi',
};

function localizeName(name: OrderItem['name']): string {
  if (typeof name === 'string') return name;
  return name.uz ?? name.ru ?? name.en ?? 'Mahsulot';
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders', { credentials: 'same-origin' });
      const json = (await res.json()) as ApiResult<{ items: Order[] }>;
      if (json.success && json.data) setOrders(json.data.items);
      else
        toast({
          title: json.error?.message ?? "Buyurtmalarni olib bo'lmadi",
          variant: 'destructive',
        });
    } catch {
      toast({ title: 'Tarmoq xatosi', variant: 'destructive' });
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const counts = React.useMemo(() => {
    return {
      total: orders.length,
      pending: orders.filter((o) => ['PENDING', 'CONFIRMED', 'PAID'].includes(o.status)).length,
      shipping: orders.filter((o) =>
        ['PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY'].includes(o.status),
      ).length,
      delivered: orders.filter((o) => o.status === 'DELIVERED').length,
    };
  }, [orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buyurtmalar"
        description="Sizning mahsulotlaringizga tegishli buyurtmalar"
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className="mr-1" />
            Yangilash
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Jami</div>
            <div className="text-2xl font-bold">{counts.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Yangi</div>
            <div className="text-2xl font-bold text-amber-600">{counts.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Jarayonda</div>
            <div className="text-2xl font-bold text-violet-600">{counts.shipping}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-muted-foreground text-xs">Yetkazildi</div>
            <div className="text-2xl font-bold text-emerald-600">{counts.delivered}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Buyurtmalar yo'q"
          description="Sizning mahsulotlaringizga hali buyurtma berilmagan"
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-mono text-sm font-semibold">{o.number}</div>
                    <div className="text-muted-foreground text-xs">
                      {formatDateTime(o.placedAt)}
                    </div>
                  </div>
                  <Badge className={STATUS_TONE[o.status] ?? 'bg-muted'}>
                    {STATUS_LABEL[o.status] ?? o.status}
                  </Badge>
                  <div className="text-right">
                    <div className="text-base font-bold">
                      {formatMoney(Number(o.sellerSubtotal))}
                    </div>
                    <div className="text-muted-foreground text-[10px]">
                      {o.itemCount} ta mahsulot
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="bg-muted/40 rounded-md p-2 text-xs">
                    <div className="font-medium">{o.customer.name}</div>
                    {o.customer.phone ? (
                      <div className="text-muted-foreground flex items-center gap-1">
                        <Phone size={10} /> {o.customer.phone}
                      </div>
                    ) : null}
                  </div>
                  <div className="bg-muted/40 rounded-md p-2 text-xs">
                    <div className="text-muted-foreground flex items-center gap-1">
                      <Truck size={10} />
                      {o.deliveryMethod === 'EXPRESS'
                        ? 'Express'
                        : o.deliveryMethod === 'PICKUP_POINT'
                          ? 'Olib ketish'
                          : 'Uyga'}
                    </div>
                    <div className="truncate">{o.address ?? '—'}</div>
                  </div>
                </div>

                <div className="mt-3 space-y-1 border-t pt-2">
                  {o.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-xs">
                      <div className="min-w-0 flex-1 truncate">
                        {localizeName(it.name)}{' '}
                        <span className="text-muted-foreground">× {it.quantity}</span>
                      </div>
                      <div className="font-medium">{formatMoney(Number(it.totalPrice))}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
