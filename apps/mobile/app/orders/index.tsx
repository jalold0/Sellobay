import { useRouter } from 'expo-router';
import { Check, CreditCard, MapPin, Package, Phone, Receipt, Truck, X } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoginRequired } from '../../src/components/login-required';
import { fetchOrders, isActiveOrder, type ApiOrder, type OrderScope } from '../../src/lib/api';
import { formatMoney, formatDate, pickLocalized } from '../../src/lib/format';
import { useT } from '../../src/lib/useT';
import { useLocale, type Locale } from '../../src/store/locale';
import { useSession } from '../../src/store/session';
import { AppImage } from '../../src/ui/app-image';
import { Button } from '../../src/ui/button';
import { EmptyState } from '../../src/ui/empty-state';
import { Header } from '../../src/ui/header';
import { Skeleton } from '../../src/ui/skeleton';

// ─── 3 tilli UI yorliqlari (status nomlari order.status.* dan) ────
const L: Record<Locale, Record<string, string>> = {
  uz: {
    local: 'Lokal',
    global: 'Global',
    active: 'Faollar',
    all: 'Barchasi',
    globalEmpty: 'Global buyurtmalar yo‘q',
    globalDesc: 'Chegaralararo xaridlar tez orada qo‘shiladi',
    activeEmpty: 'Faol buyurtma yo‘q',
    items: 'ta tovar',
    recipient: 'Qabul qiluvchi',
    pickup: 'Topshirish punktiga',
    home: 'Manzilga yetkazish',
    express: 'Express yetkazish',
    delivered: 'Yetkazildi',
    cancelled: 'Bekor qilindi',
    total: 'Jami',
    rate: 'Tovarlarni baholash',
  },
  ru: {
    local: 'Локальные',
    global: 'Глобальные',
    active: 'Активные',
    all: 'Все',
    globalEmpty: 'Нет глобальных заказов',
    globalDesc: 'Трансграничные покупки появятся скоро',
    activeEmpty: 'Нет активных заказов',
    items: 'тов.',
    recipient: 'Получатель',
    pickup: 'В пункт выдачи',
    home: 'Доставка на адрес',
    express: 'Экспресс-доставка',
    delivered: 'Доставлен',
    cancelled: 'Отменён',
    total: 'Итого',
    rate: 'Оценить товары',
  },
  en: {
    local: 'Local',
    global: 'Global',
    active: 'Active',
    all: 'All',
    globalEmpty: 'No global orders',
    globalDesc: 'Cross-border orders coming soon',
    activeEmpty: 'No active orders',
    items: 'items',
    recipient: 'Recipient',
    pickup: 'To pickup point',
    home: 'Home delivery',
    express: 'Express delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    total: 'Total',
    rate: 'Rate products',
  },
};

// ─── Status qadamlari (ikon bilan kuzatuv) ───────────────────────
type StepKey = 'ordered' | 'paid' | 'preparing' | 'shipped' | 'delivered';
const STEPS: Array<{ key: StepKey; icon: typeof Package; statuses: string[] }> = [
  { key: 'ordered', icon: Receipt, statuses: ['PENDING', 'CONFIRMED'] },
  { key: 'paid', icon: CreditCard, statuses: ['PAID'] },
  { key: 'preparing', icon: Package, statuses: ['PROCESSING', 'PACKED'] },
  { key: 'shipped', icon: Truck, statuses: ['SHIPPED', 'OUT_FOR_DELIVERY'] },
  { key: 'delivered', icon: Check, statuses: ['DELIVERED'] },
];
const STEP_LABEL: Record<Locale, Record<StepKey, string>> = {
  uz: {
    ordered: 'Qabul',
    paid: 'To‘lov',
    preparing: 'Tayyor',
    shipped: 'Yo‘lda',
    delivered: 'Yetkazildi',
  },
  ru: {
    ordered: 'Принят',
    paid: 'Оплата',
    preparing: 'Сборка',
    shipped: 'В пути',
    delivered: 'Доставлен',
  },
  en: {
    ordered: 'Placed',
    paid: 'Paid',
    preparing: 'Packed',
    shipped: 'Shipped',
    delivered: 'Delivered',
  },
};

function stepIndexOf(status: string): number {
  const i = STEPS.findIndex((s) => s.statuses.includes(status));
  return i; // -1 agar terminal (cancelled/returned/refunded)
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-amber-100', text: 'text-amber-700' },
  CONFIRMED: { bg: 'bg-sky-100', text: 'text-sky-700' },
  PAID: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  PROCESSING: { bg: 'bg-sky-100', text: 'text-sky-700' },
  PACKED: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  SHIPPED: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  OUT_FOR_DELIVERY: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  DELIVERED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CANCELLED: { bg: 'bg-rose-100', text: 'text-rose-700' },
  RETURNED: { bg: 'bg-rose-100', text: 'text-rose-700' },
  REFUNDED: { bg: 'bg-muted', text: 'text-muted-foreground' },
};

export default function OrdersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const locale = useLocale((s) => s.locale);
  const tr = L[locale] ?? L.uz;
  const { isAuthenticated } = useSession();

  const [orders, setOrders] = React.useState<ApiOrder[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [scope, setScope] = React.useState<OrderScope>('LOCAL');
  const [onlyActive, setOnlyActive] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchOrders()
      .then((data) => {
        if (active) setOrders(data ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const filtered = React.useMemo(() => {
    if (!orders) return [];
    return orders
      .filter((o) => (o.scope ?? 'LOCAL') === scope)
      .filter((o) => (onlyActive ? isActiveOrder(o.status) : true));
  }, [orders, scope, onlyActive]);

  return (
    <View className="bg-background flex-1">
      <Header title={t('profile.ordersPage.title')} showBack fallbackHref="/(tabs)/profile" />

      {/* Scope: Lokal / Global */}
      <View className="flex-row gap-2 px-4 pb-2 pt-1">
        {(['LOCAL', 'GLOBAL'] as OrderScope[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => setScope(s)}
            className={`flex-1 items-center rounded-full py-2 ${
              scope === s ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <Text
              className={`text-sm font-bold ${scope === s ? 'text-white' : 'text-muted-foreground'}`}
            >
              {s === 'LOCAL' ? tr.local : tr.global}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Status: Faollar / Barchasi */}
      <View className="border-border flex-row border-b px-4">
        {[true, false].map((act) => (
          <Pressable key={String(act)} onPress={() => setOnlyActive(act)} className="mr-5 py-2.5">
            <Text
              className={`text-sm font-semibold ${
                onlyActive === act ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {act ? tr.active : tr.all}
            </Text>
            {onlyActive === act ? (
              <View className="bg-primary absolute -bottom-px left-0 right-0 h-0.5 rounded-full" />
            ) : null}
          </Pressable>
        ))}
      </View>

      {!isAuthenticated ? (
        <LoginRequired />
      ) : loading ? (
        <View className="gap-3 p-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-52 w-full rounded-2xl" />
          ))}
        </View>
      ) : scope === 'GLOBAL' ? (
        <EmptyState
          icon={<Package size={26} color="#94a3b8" />}
          title={tr.globalEmpty}
          description={tr.globalDesc}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={26} color="#94a3b8" />}
          title={onlyActive ? tr.activeEmpty : t('profile.ordersPage.emptyTitle')}
          description={t('profile.ordersPage.emptyDesc')}
          action={
            <Button onPress={() => router.push('/(tabs)/catalog')} fullWidth>
              {t('cart.continueShopping')}
            </Button>
          }
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 14 }}
        >
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} locale={locale} tr={tr} t={t} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Status kuzatuv tasmasi (faol buyurtmalar uchun) ─────────────
function StatusTracker({ status, locale }: { status: string; locale: Locale }) {
  const cur = stepIndexOf(status);
  return (
    <View className="flex-row items-start">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i <= cur;
        return (
          <React.Fragment key={step.key}>
            <View className="items-center" style={{ width: 52 }}>
              <View
                className={`h-8 w-8 items-center justify-center rounded-full ${
                  done ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <Icon size={15} color={done ? '#fff' : '#94a3b8'} strokeWidth={2.4} />
              </View>
              <Text
                className={`mt-1 text-[9px] ${
                  done ? 'text-foreground font-semibold' : 'text-muted-foreground'
                }`}
                numberOfLines={1}
              >
                {STEP_LABEL[locale][step.key]}
              </Text>
            </View>
            {i < STEPS.length - 1 ? (
              <View
                className={`mt-4 h-0.5 flex-1 ${i < cur ? 'bg-primary' : 'bg-border'}`}
                style={{ marginHorizontal: -8 }}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─── Buyurtma kartasi ────────────────────────────────────────────
function OrderCard({
  order,
  locale,
  tr,
  t,
}: {
  order: ApiOrder;
  locale: Locale;
  tr: Record<string, string>;
  t: (k: string) => string;
}) {
  const badge = STATUS_BADGE[order.status] ?? STATUS_BADGE.PENDING;
  const active = isActiveOrder(order.status);
  const cancelled = ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(order.status);
  const addr = order.shippingAddress;
  const deliveryLabel =
    order.deliveryMethod === 'PICKUP_POINT'
      ? tr.pickup
      : order.deliveryMethod === 'EXPRESS'
        ? tr.express
        : tr.home;
  const shown = order.items.slice(0, 4);
  const extra = order.items.length - shown.length;

  return (
    <View className="border-border bg-card rounded-2xl border p-4">
      {/* Sarlavha: status badge + raqam + sana */}
      <View className="flex-row items-center justify-between">
        <View className={`rounded-full px-2.5 py-1 ${badge.bg}`}>
          <Text className={`text-[11px] font-bold ${badge.text}`}>
            {t(`order.status.${order.status}`)}
          </Text>
        </View>
        <Text className="text-muted-foreground text-xs">{formatDate(order.placedAt)}</Text>
      </View>
      <Text className="text-foreground mt-1.5 text-sm font-bold">{order.number}</Text>

      {/* Status kuzatuv (faol) yoki yakuniy holat */}
      {active ? (
        <View className="mt-3">
          <StatusTracker status={order.status} locale={locale} />
        </View>
      ) : (
        <View className="mt-2 flex-row items-center gap-1.5">
          {cancelled ? <X size={14} color="#ef4444" /> : <Check size={14} color="#10b981" />}
          <Text
            className={`text-xs font-semibold ${cancelled ? 'text-rose-600' : 'text-emerald-600'}`}
          >
            {cancelled ? tr.cancelled : tr.delivered}
            {order.deliveredAt ? ` · ${formatDate(order.deliveredAt)}` : ''}
          </Text>
        </View>
      )}

      {/* Mahsulot rasmlari + nomlari */}
      <View className="mt-3 flex-row gap-2">
        {shown.map((it) => (
          <View key={it.id} className="bg-muted h-16 w-16 overflow-hidden rounded-xl">
            {it.imageUrl ? (
              <AppImage source={{ uri: it.imageUrl }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <View className="h-full w-full items-center justify-center">
                <Package size={20} color="#cbd5e1" />
              </View>
            )}
          </View>
        ))}
        {extra > 0 ? (
          <View className="bg-muted h-16 w-16 items-center justify-center rounded-xl">
            <Text className="text-muted-foreground text-sm font-bold">+{extra}</Text>
          </View>
        ) : null}
      </View>

      {/* Birinchi mahsulot nomi (qisqa) */}
      {shown[0] ? (
        <Text numberOfLines={2} className="text-foreground mt-2 text-sm">
          {pickLocalized(shown[0].nameSnapshot, locale)}
          {order.items.length > 1 ? ` +${order.items.length - 1}` : ''}
        </Text>
      ) : null}

      <Text className="text-muted-foreground mt-1 text-xs">
        {order.itemCount} {tr.items} · {formatMoney(order.grandTotal)}
      </Text>

      {/* Manzil + qabul qiluvchi */}
      {addr ? (
        <View className="border-border mt-3 gap-1.5 border-t pt-3">
          <View className="flex-row items-start gap-2">
            <MapPin size={14} color="#94a3b8" />
            <View className="flex-1">
              <Text className="text-foreground text-xs font-semibold">{deliveryLabel}</Text>
              <Text className="text-muted-foreground text-xs">
                {[addr.region, addr.city, addr.district, addr.street, addr.building, addr.apartment]
                  .filter(Boolean)
                  .join(', ')}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <Phone size={14} color="#94a3b8" />
            <Text className="text-muted-foreground text-xs">
              {addr.recipientName} · {addr.phone}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Jami */}
      <View className="border-border mt-3 flex-row items-center justify-between border-t pt-3">
        <Text className="text-muted-foreground text-xs">{tr.total}</Text>
        <Text className="text-foreground text-base font-bold">{formatMoney(order.grandTotal)}</Text>
      </View>
    </View>
  );
}
