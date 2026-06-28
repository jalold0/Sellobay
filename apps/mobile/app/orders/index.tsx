import { useRouter } from 'expo-router';
import { LogIn, Package } from 'lucide-react-native';
import * as React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchOrders, type ApiOrder } from '../../src/lib/api';
import { formatMoney, formatDate } from '../../src/lib/format';
import { useT } from '../../src/lib/useT';
import { useSession } from '../../src/store/session';
import { Button } from '../../src/ui/button';
import { EmptyState } from '../../src/ui/empty-state';
import { Header } from '../../src/ui/header';
import { Skeleton } from '../../src/ui/skeleton';

// Buyurtma holatiga ko'ra rang (badge)
const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
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
  const { isAuthenticated } = useSession();

  const [orders, setOrders] = React.useState<ApiOrder[] | null>(null);
  const [loading, setLoading] = React.useState(true);

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

  return (
    <View className="bg-background flex-1">
      <Header title={t('profile.ordersPage.title')} showBack fallbackHref="/(tabs)/profile" />

      {!isAuthenticated ? (
        <EmptyState
          icon={<LogIn size={26} color="#94a3b8" />}
          title={t('nav.login')}
          description={t('auth.noAccount')}
          action={
            <Button onPress={() => router.push('/auth/login')} fullWidth>
              {t('nav.login')}
            </Button>
          }
        />
      ) : loading ? (
        <View className="gap-3 p-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </View>
      ) : !orders || orders.length === 0 ? (
        <EmptyState
          icon={<Package size={26} color="#94a3b8" />}
          title={t('profile.ordersPage.emptyTitle')}
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
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}
        >
          {orders.map((o) => {
            const st = STATUS_STYLE[o.status] ?? STATUS_STYLE.PENDING;
            return (
              <View key={o.id} className="border-border bg-card rounded-2xl border p-4">
                <View className="flex-row items-center justify-between">
                  <Text className="text-foreground text-sm font-bold">{o.number}</Text>
                  <View className={`rounded-full px-2.5 py-1 ${st.bg}`}>
                    <Text className={`text-[11px] font-bold ${st.text}`}>
                      {t(`order.status.${o.status}`)}
                    </Text>
                  </View>
                </View>
                <Text className="text-muted-foreground mt-0.5 text-xs">
                  {formatDate(o.placedAt)} ·{' '}
                  {t('profile.ordersPage.itemsCount').replace('{count}', String(o.itemCount))}
                </Text>

                <View className="border-border my-3 border-t" />

                <View className="gap-1.5">
                  {o.items.slice(0, 3).map((it) => (
                    <View key={it.id} className="flex-row items-center justify-between">
                      <Text numberOfLines={1} className="text-foreground flex-1 pr-2 text-sm">
                        {it.nameSnapshot} × {it.quantity}
                      </Text>
                      <Text className="text-muted-foreground text-xs">
                        {formatMoney(it.totalPrice)}
                      </Text>
                    </View>
                  ))}
                  {o.items.length > 3 ? (
                    <Text className="text-muted-foreground text-xs">
                      +{o.items.length - 3}{' '}
                      {t('profile.ordersPage.itemsCount').replace('{count}', '').trim()}
                    </Text>
                  ) : null}
                </View>

                <View className="border-border mt-3 flex-row items-center justify-between border-t pt-3">
                  <Text className="text-muted-foreground text-xs">{t('cart.total')}</Text>
                  <Text className="text-foreground text-base font-bold">
                    {formatMoney(o.grandTotal)}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
