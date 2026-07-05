import { useRouter } from 'expo-router';
import { ChevronLeft, Ticket } from 'lucide-react-native';
import * as React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { claimPromo, fetchPromos, type UserPromo } from '../../src/lib/api';
import { formatDate, formatNumber } from '../../src/lib/format';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
import { useSession } from '../../src/store/session';
import { toast } from '../../src/store/toast';

const PAPER = '#FAF9F7';

// Kupon turiga qarab tint + accent (dizayn: bordo/yashil/amber)
function couponTheme(p: UserPromo): { tint: string; accent: string } {
  if (p.type === 'FREE_SHIPPING') return { tint: '#EDF7F1', accent: '#1F8A5B' };
  if (p.type === 'FIXED') return { tint: '#FFF6E6', accent: '#B45309' };
  return { tint: '#FDF3F5', accent: '#531625' };
}

export default function PromoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();
  const isAuthenticated = useSession((s) => s.isAuthenticated);

  const [promos, setPromos] = React.useState<UserPromo[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [code, setCode] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = React.useCallback(async () => {
    const data = await fetchPromos();
    setPromos(data ?? []);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    void load();
    return () => clearTimeout(copyTimer.current);
  }, [load]);

  const onApply = async () => {
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
    toast({ title: res.alreadyHad ? t('promo.alreadyHad') : t('promo.added'), variant: 'success' });
    setCode('');
    await load();
  };

  const onCopy = (c: string) => {
    haptics.select();
    setCopied(c);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(null), 1600);
  };

  const active = (promos ?? []).filter((p) => p.status === 'ACTIVE');
  const used = (promos ?? []).filter((p) => p.status !== 'ACTIVE');

  return (
    <View className="flex-1" style={{ backgroundColor: PAPER, paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="bg-muted h-10 w-10 items-center justify-center rounded-full"
        >
          <ChevronLeft size={20} color="#0A0A0C" />
        </Pressable>
        <Text className="text-foreground font-serif text-2xl leading-6">{t('promo.title')}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 14 }}
      >
        {/* Kod kiritish */}
        <View className="flex-row gap-2.5">
          <View
            className="h-[50px] flex-1 justify-center rounded-2xl border-[1.5px] border-dashed px-4"
            style={{ backgroundColor: '#FDF9FA', borderColor: '#D8B9C2' }}
          >
            <TextInput
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              placeholder="Promokodni kiriting"
              placeholderTextColor="#9a9aa2"
              autoCapitalize="characters"
              autoCorrect={false}
              className="text-foreground text-sm font-semibold"
              style={{ letterSpacing: 1 }}
            />
          </View>
          <Pressable
            onPress={onApply}
            disabled={submitting}
            className="bg-primary h-[50px] w-24 items-center justify-center rounded-2xl active:opacity-85"
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-sm font-bold text-white">Qo'llash</Text>
            )}
          </Pressable>
        </View>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#531625" />
          </View>
        ) : (
          <>
            <Text className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-300">
              Faol kuponlar
            </Text>
            {active.length === 0 ? (
              <View className="items-center gap-2 py-8">
                <Ticket size={30} color="#c9c9d0" />
                <Text className="text-muted-foreground text-sm">{t('promo.empty')}</Text>
              </View>
            ) : (
              active.map((p) => (
                <CouponCard
                  key={p.id}
                  promo={p}
                  copied={copied === p.code}
                  onCopy={() => onCopy(p.code)}
                />
              ))
            )}

            {used.length > 0 ? (
              <>
                <Text className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-300">
                  Ishlatilgan
                </Text>
                {used.map((p) => (
                  <View
                    key={p.id}
                    className="border-border flex-row items-center gap-3 rounded-2xl border bg-white p-3.5 opacity-60"
                  >
                    <View
                      className="h-10 w-10 items-center justify-center rounded-xl"
                      style={{ backgroundColor: '#F1F1F3' }}
                    >
                      <Ticket size={18} color="#9a9aa2" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-foreground text-[13px] font-semibold line-through">
                        {p.code}
                      </Text>
                      <Text className="mt-0.5 text-[11px] text-neutral-300">
                        {t(`promo.status.${p.status}`)}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CouponCard({
  promo,
  copied,
  onCopy,
}: {
  promo: UserPromo;
  copied: boolean;
  onCopy: () => void;
}) {
  const { t } = useT();
  const { tint, accent } = couponTheme(promo);
  const title =
    promo.type === 'PERCENT'
      ? `${promo.value}% chegirma`
      : promo.type === 'FIXED'
        ? `${formatNumber(promo.value)} so'm`
        : 'Bepul yetkazish';
  const sub =
    promo.type === 'PERCENT'
      ? t('promo.descPercent').replace('{value}', String(promo.value))
      : promo.type === 'FIXED'
        ? t('promo.descFixed').replace('{value}', formatNumber(promo.value))
        : t('promo.descFreeShip');
  const cond = promo.minOrderTotal
    ? t('promo.minOrder').replace('{amount}', formatNumber(promo.minOrderTotal))
    : null;
  const expiry = promo.endsAt
    ? t('promo.validUntil').replace('{date}', formatDate(promo.endsAt))
    : t('promo.noExpiry');

  return (
    <View className="overflow-hidden rounded-[18px] p-4" style={{ backgroundColor: tint }}>
      {/* perforatsiya doiralari */}
      <View
        style={{
          position: 'absolute',
          left: -9,
          top: '50%',
          marginTop: -9,
          width: 18,
          height: 18,
          borderRadius: 999,
          backgroundColor: PAPER,
        }}
      />
      <View
        style={{
          position: 'absolute',
          right: -9,
          top: '50%',
          marginTop: -9,
          width: 18,
          height: 18,
          borderRadius: 999,
          backgroundColor: PAPER,
        }}
      />

      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-foreground font-serif text-xl leading-6">{title}</Text>
          <Text className="text-muted-foreground mt-1 text-xs">{sub}</Text>
          {cond ? <Text className="mt-2 text-[11px] text-neutral-300">{cond}</Text> : null}
        </View>
        <Ticket size={26} color={accent} />
      </View>

      <View
        className="mt-3.5 flex-row items-center justify-between gap-2.5 border-t border-dashed pt-3"
        style={{ borderColor: 'rgba(0,0,0,0.12)' }}
      >
        <View className="flex-1">
          <Text className="text-base font-extrabold" style={{ color: accent, letterSpacing: 1 }}>
            {promo.code}
          </Text>
          <Text className="mt-0.5 text-[10px] text-neutral-300">{expiry}</Text>
        </View>
        <Pressable
          onPress={onCopy}
          className="rounded-full px-4 py-2.5"
          style={{ backgroundColor: accent }}
        >
          <Text className="text-xs font-bold text-white">
            {copied ? 'Nusxa olindi ✓' : 'Nusxa olish'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
