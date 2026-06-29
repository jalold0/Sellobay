import { useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, Clock, Tag, Ticket, X } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { claimPromo, fetchPromos, type CouponStatus, type UserPromo } from '../../src/lib/api';
import { formatDate, formatNumber } from '../../src/lib/format';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
import { useSession } from '../../src/store/session';
import { toast } from '../../src/store/toast';
import { Button } from '../../src/ui/button';
import { cn } from '../../src/ui/cn';
import { EmptyState } from '../../src/ui/empty-state';
import { Input } from '../../src/ui/input';

const STATUS_STYLE: Record<CouponStatus, { box: string; text: string }> = {
  ACTIVE: { box: 'bg-emerald-100', text: 'text-emerald-700' },
  USED: { box: 'bg-muted', text: 'text-muted-foreground' },
  EXPIRED: { box: 'bg-rose-100', text: 'text-rose-600' },
  INACTIVE: { box: 'bg-muted', text: 'text-muted-foreground' },
};

export default function PromoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const isAuthenticated = useSession((s) => s.isAuthenticated);

  const [promos, setPromos] = React.useState<UserPromo[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [adding, setAdding] = React.useState(false);
  const [code, setCode] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const load = React.useCallback(async () => {
    const data = await fetchPromos();
    setPromos(data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onAdd = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    if (!isAuthenticated) {
      toast({ title: t('promo.loginRequired'), variant: 'warning' });
      return;
    }
    setSubmitting(true);
    const res = await claimPromo(trimmed);
    setSubmitting(false);
    if (!res.success) {
      haptics.error();
      toast({ title: res.error?.message ?? t('promo.added'), variant: 'destructive' });
      return;
    }
    haptics.success();
    toast({
      title: res.alreadyHad ? t('promo.alreadyHad') : t('promo.added'),
      variant: 'success',
    });
    setCode('');
    setAdding(false);
    await load();
  };

  return (
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="flex-row items-center px-3 pb-1">
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          className="active:bg-muted h-10 w-10 items-center justify-center rounded-full"
        >
          <ChevronLeft size={22} color="#0A0A0C" />
        </Pressable>
        <Text className="flex-1 text-center text-base font-semibold">{t('promo.title')}</Text>
        <View className="w-10" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#8B0020" />
        </View>
      ) : promos && promos.length > 0 ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: insets.bottom + 100,
            gap: 12,
          }}
        >
          {promos.map((p) => (
            <PromoCard key={p.id} promo={p} />
          ))}
        </ScrollView>
      ) : (
        <EmptyState
          icon={<Ticket size={32} color="#94a3b8" />}
          title={t('promo.empty')}
          description={t('promo.emptyDesc')}
        />
      )}

      {/* Sticky add button */}
      <View
        style={{ paddingBottom: insets.bottom + 12 }}
        className="border-border bg-background absolute inset-x-0 bottom-0 border-t px-4 pt-3"
      >
        <Button
          fullWidth
          size="lg"
          leftIcon={<Tag size={16} color="#fff" />}
          onPress={() => {
            haptics.light();
            setAdding(true);
          }}
        >
          {t('promo.add')}
        </Button>
      </View>

      {/* Add promo modal */}
      <Modal
        visible={adding}
        transparent
        animationType="fade"
        onRequestClose={() => setAdding(false)}
      >
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setAdding(false)}>
          <Pressable
            className="bg-background gap-3 rounded-t-3xl p-5"
            style={{ paddingBottom: insets.bottom + 20 }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-foreground text-lg font-bold">{t('promo.addTitle')}</Text>
              <Pressable onPress={() => setAdding(false)} hitSlop={8}>
                <X size={22} color="#6B6B73" />
              </Pressable>
            </View>
            <Input
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder={t('promo.placeholder')}
              autoCapitalize="characters"
              autoCorrect={false}
              leftIcon={<Tag size={16} color="#94a3b8" />}
            />
            <Button fullWidth size="lg" loading={submitting} onPress={onAdd}>
              {t('promo.apply')}
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function PromoCard({ promo }: { promo: UserPromo }) {
  const { t } = useT();
  const dimmed = promo.status !== 'ACTIVE';
  const style = STATUS_STYLE[promo.status];

  const discountText =
    promo.type === 'PERCENT'
      ? t('promo.descPercent').replace('{value}', String(promo.value))
      : promo.type === 'FIXED'
        ? t('promo.descFixed').replace('{value}', formatNumber(promo.value))
        : t('promo.descFreeShip');

  const minText = promo.minOrderTotal
    ? t('promo.minOrder').replace('{amount}', formatNumber(promo.minOrderTotal))
    : null;

  const expiryText = promo.endsAt
    ? t('promo.validUntil').replace('{date}', formatDate(promo.endsAt))
    : t('promo.noExpiry');

  return (
    <View className={cn('border-border bg-card rounded-2xl border p-4', dimmed && 'opacity-60')}>
      <View className="flex-row items-start justify-between">
        <View className="min-w-0 flex-1 pr-2">
          <Text className="text-foreground text-lg font-black tracking-wide">{promo.code}</Text>
          <Text className="text-foreground mt-1 text-sm font-medium">
            {discountText}
            {minText ? (
              <Text className="text-muted-foreground font-normal"> · {minText}</Text>
            ) : null}
          </Text>
        </View>
        <View className={cn('rounded-md px-2 py-1', style.box)}>
          <Text className={cn('text-[10px] font-bold', style.text)}>
            {t(`promo.status.${promo.status}`)}
          </Text>
        </View>
      </View>
      <View className="mt-2.5 flex-row items-center gap-1.5">
        {promo.status === 'USED' ? (
          <CheckCircle2 size={13} color="#94a3b8" />
        ) : (
          <Clock size={13} color="#94a3b8" />
        )}
        <Text className="text-muted-foreground text-xs">{expiryText}</Text>
      </View>
    </View>
  );
}
