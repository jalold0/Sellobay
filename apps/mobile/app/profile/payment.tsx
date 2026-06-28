import { CreditCard, Info, Trash2 } from 'lucide-react-native';
import * as React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoginRequired } from '../../src/components/login-required';
import { deletePaymentMethod, fetchPaymentMethods, type ApiPaymentMethod } from '../../src/lib/api';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
import { useSession } from '../../src/store/session';
import { toast } from '../../src/store/toast';
import { EmptyState } from '../../src/ui/empty-state';
import { Header } from '../../src/ui/header';
import { Skeleton } from '../../src/ui/skeleton';

export default function PaymentScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const { isAuthenticated } = useSession();

  const [items, setItems] = React.useState<ApiPaymentMethod[] | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    fetchPaymentMethods()
      .then((data) => {
        if (active) setItems(data ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const onDelete = (pm: ApiPaymentMethod) => {
    Alert.alert(t('profile.paymentPage.title'), t('profile.paymentPage.deleteConfirm'), [
      { text: t('profile.addressesPage.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          const ok = await deletePaymentMethod(pm.id);
          if (ok) {
            haptics.success();
            toast({ title: t('profile.paymentPage.deleted'), variant: 'success' });
            setItems((prev) => prev?.filter((x) => x.id !== pm.id) ?? null);
          } else {
            toast({ title: t('profile.paymentPage.error'), variant: 'destructive' });
          }
        },
      },
    ]);
  };

  return (
    <View className="bg-background flex-1">
      <Header title={t('profile.paymentPage.title')} showBack fallbackHref="/(tabs)/profile" />

      {!isAuthenticated ? (
        <LoginRequired />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}
        >
          {/* Ma'lumot banneri */}
          <View className="flex-row gap-2.5 rounded-2xl border border-sky-200 bg-sky-50 p-3.5">
            <Info size={18} color="#0284c7" />
            <Text className="flex-1 text-xs text-sky-900">
              <Text className="font-bold">{t('profile.paymentPage.noticeStrong')}</Text>
              {t('profile.paymentPage.noticeBody')}
            </Text>
          </View>

          {loading ? (
            <View className="gap-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-2xl" />
              ))}
            </View>
          ) : !items || items.length === 0 ? (
            <EmptyState
              icon={<CreditCard size={26} color="#94a3b8" />}
              title={t('profile.paymentPage.emptyTitle')}
              description={t('profile.paymentPage.emptyDesc')}
            />
          ) : (
            items.map((pm) => (
              <View
                key={pm.id}
                className="border-border bg-card flex-row items-center gap-3 rounded-2xl border p-4"
              >
                <View className="bg-muted h-11 w-11 items-center justify-center rounded-xl">
                  <CreditCard size={20} color="#0A0A0C" />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-foreground text-sm font-bold">
                      {pm.brand || pm.provider} •••• {pm.last4 ?? '----'}
                    </Text>
                    {pm.isDefault ? (
                      <View className="rounded-full bg-emerald-100 px-2 py-0.5">
                        <Text className="text-[10px] font-bold text-emerald-700">
                          {t('profile.paymentPage.defaultBadge')}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  {pm.expiryMonth && pm.expiryYear ? (
                    <Text className="text-muted-foreground text-xs">
                      {t('profile.paymentPage.expires')} {String(pm.expiryMonth).padStart(2, '0')}/
                      {pm.expiryYear}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => onDelete(pm)}
                  hitSlop={8}
                  className="active:bg-muted h-9 w-9 items-center justify-center rounded-full"
                >
                  <Trash2 size={16} color="#ef4444" />
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
