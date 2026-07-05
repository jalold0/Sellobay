import { CreditCard, Lock, Plus, Trash2 } from 'lucide-react-native';
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
import { Gradient } from '../../src/ui/gradient';
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
    <View className="bg-paper flex-1">
      <Header title={t('profile.paymentPage.title')} showBack fallbackHref="/(tabs)/profile" />

      {!isAuthenticated ? (
        <LoginRequired />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 12 }}
        >
          {loading ? (
            <View className="gap-3">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-[20px]" />
              ))}
            </View>
          ) : !items || items.length === 0 ? (
            <EmptyState
              icon={<CreditCard size={26} color="#94a3b8" />}
              title={t('profile.paymentPage.emptyTitle')}
              description={t('profile.paymentPage.emptyDesc')}
            />
          ) : (
            items.map((pm, i) => (
              <Pressable key={pm.id} onLongPress={() => onDelete(pm)} delayLongPress={350}>
                <Gradient
                  colors={i % 2 === 1 ? ['#16161A', '#0A0A0C'] : ['#531625', '#3A0E19']}
                  style={{ borderRadius: 20, padding: 20 }}
                >
                  <View className="flex-row items-center gap-2">
                    <Text
                      className="text-sm text-white"
                      style={{ fontWeight: '800', letterSpacing: 0.5 }}
                    >
                      {pm.brand || pm.provider}
                    </Text>
                    {pm.isDefault ? (
                      <View
                        className="rounded-full px-2 py-0.5"
                        style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                      >
                        <Text className="text-[10px] font-bold" style={{ color: '#E5C77A' }}>
                          {t('profile.paymentPage.defaultBadge')}
                        </Text>
                      </View>
                    ) : null}
                    <View className="flex-1" />
                    <Pressable
                      onPress={() => onDelete(pm)}
                      hitSlop={8}
                      className="h-8 w-8 items-center justify-center rounded-full active:opacity-70"
                      style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                    >
                      <Trash2 size={15} color="#ffffff" />
                    </Pressable>
                  </View>

                  <Text
                    className="mt-6 text-[19px] text-white"
                    style={{ letterSpacing: 2, fontWeight: '600' }}
                  >
                    •••• •••• •••• {pm.last4 ?? '----'}
                  </Text>

                  <View className="mt-6 flex-row items-end justify-between">
                    <View>
                      <Text
                        className="text-[10px]"
                        style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}
                      >
                        {t('profile.paymentPage.expires')}
                      </Text>
                      <Text className="mt-0.5 text-sm text-white" style={{ fontWeight: '600' }}>
                        {pm.expiryMonth && pm.expiryYear
                          ? `${String(pm.expiryMonth).padStart(2, '0')}/${pm.expiryYear}`
                          : '--/--'}
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <View
                        className="h-[26px] w-[26px] rounded-full"
                        style={{ backgroundColor: 'rgba(229,199,122,0.9)' }}
                      />
                      <View
                        className="-ml-2.5 h-[26px] w-[26px] rounded-full"
                        style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
                      />
                    </View>
                  </View>
                </Gradient>
              </Pressable>
            ))
          )}

          {/* Karta qo'shish CTA */}
          {!loading ? (
            <Pressable
              onPress={() =>
                toast({
                  title: t('profile.paymentPage.noticeStrong'),
                  description: t('profile.paymentPage.noticeBody'),
                })
              }
              className="flex-row items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed p-[15px] active:opacity-70"
              style={{ borderColor: '#DAD2CC' }}
            >
              <Plus size={18} color="#531625" />
              <Text className="text-primary font-semibold">
                {t('profile.paymentPage.noticeStrong')}
              </Text>
            </Pressable>
          ) : null}

          {/* Xavfsizlik eslatmasi */}
          <View className="bg-muted flex-row items-center gap-2.5 rounded-xl p-3">
            <Lock size={16} color="#6B6B73" />
            <Text className="text-muted-foreground flex-1 text-xs leading-4">
              <Text className="font-bold">{t('profile.paymentPage.noticeStrong')}</Text>
              {t('profile.paymentPage.noticeBody')}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
