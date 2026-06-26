import { useRouter } from 'expo-router';
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck,
  ChevronLeft,
  Coins,
  Gift,
  Tag,
} from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { checkinDaily, fetchLoyalty } from '../../src/lib/api';
import { formatNumber } from '../../src/lib/format';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/lib/useT';
import {
  COIN_VALUE_SOM,
  EARN_WAYS,
  MOCK_LOYALTY,
  REDEEM_WAYS,
  TIERS,
  coinsToSom,
  currentTier,
  nextTier,
  tierProgressPct,
  type CoinTxn,
} from '../../src/lib/loyalty';
import { toast } from '../../src/store/toast';

const CHECKIN_REWARD = 5;

export default function LoyaltyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useT();

  const REASON_LABEL: Record<string, string> = {
    orderEarn: t('loyalty.history.orderEarn'),
    discount: t('loyalty.history.discount'),
    review: t('loyalty.history.review'),
    referral: t('loyalty.history.referral'),
  };

  const [coins, setCoins] = React.useState(MOCK_LOYALTY.coins);
  const [spent, setSpent] = React.useState(MOCK_LOYALTY.spentSom);
  const [history, setHistory] = React.useState<CoinTxn[]>(MOCK_LOYALTY.history);
  const [checkedIn, setCheckedIn] = React.useState(false);

  // Login bo'lsa real balans/tarix (Bearer token orqali). Aks holda mock qoladi.
  React.useEffect(() => {
    let active = true;
    fetchLoyalty()
      .then((data) => {
        if (!active || !data) return;
        setCoins(data.coins);
        setSpent(data.spentSom);
        setHistory(
          data.history.map((t) => ({
            id: t.id,
            type: t.amount >= 0 ? 'earn' : 'spend',
            amount: t.amount,
            reason: REASON_LABEL[t.reasonKey] ?? 'Buyurtmadan',
            daysAgo: t.daysAgo,
          })),
        );
        setCheckedIn(Boolean(data.checkedInToday));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const cur = currentTier(spent);
  const next = nextTier(spent);
  const progress = tierProgressPct(spent);

  const [claiming, setClaiming] = React.useState(false);
  const onCheckIn = async () => {
    if (checkedIn || claiming) return;
    setClaiming(true);
    const res = await checkinDaily();
    setClaiming(false);
    if (res) {
      setCheckedIn(true);
      setCoins(res.balance);
      if (!res.alreadyClaimed) {
        haptics.success();
        toast({ title: t('loyalty.checkinToast'), variant: 'success' });
      }
    } else {
      // Login emas / xato — optimistik fallback
      haptics.success();
      setCheckedIn(true);
      setCoins((c) => c + CHECKIN_REWARD);
      toast({ title: t('loyalty.checkinToast'), variant: 'success' });
    }
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
        <Text className="flex-1 text-center text-base font-semibold">{t('loyalty.title')}</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 32,
          gap: 16,
        }}
      >
        {/* Balance hero */}
        <View className="overflow-hidden rounded-3xl">
          <View className="bg-primary p-5">
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-center gap-2.5">
                <Text className="text-3xl">{cur.icon}</Text>
                <View>
                  <Text className="text-[10px] uppercase tracking-wide text-white/70">
                    {t('loyalty.currentTier')}
                  </Text>
                  <Text className="text-xl font-bold text-white">{cur.label}</Text>
                  <Text className="text-[11px] text-white/80">
                    {t('loyalty.cashback').replace('{pct}', String(cur.cashbackPct))}
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-[10px] uppercase tracking-wide text-white/70">
                  {t('loyalty.balance')}
                </Text>
                <View className="flex-row items-center gap-1">
                  <Coins size={18} color="#fff" />
                  <Text className="text-2xl font-black text-white">{formatNumber(coins)}</Text>
                </View>
                <Text className="text-[11px] text-white/80">
                  ≈ {formatNumber(coinsToSom(coins))} so&apos;m
                </Text>
              </View>
            </View>

            {next ? (
              <View className="mt-4">
                <View className="mb-1 flex-row justify-between">
                  <Text className="text-[11px] text-white/85">
                    {t('loyalty.nextTier').replace('{tier}', `${next.icon} ${next.label}`)}
                  </Text>
                  <Text className="text-[11px] text-white/85">
                    {t('loyalty.spendMore').replace('{amount}', formatNumber(next.min - spent))}
                  </Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-white/25">
                  <View
                    className="h-full rounded-full bg-white"
                    style={{ width: `${progress}%` }}
                  />
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* Daily check-in */}
        <View className="border-border bg-card flex-row items-center gap-3 rounded-2xl border p-4">
          <View className="h-11 w-11 items-center justify-center rounded-full bg-amber-100">
            <CalendarCheck size={20} color="#d97706" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-foreground text-sm font-semibold">
              {checkedIn ? t('loyalty.checkinDone') : t('loyalty.checkinCta')}
            </Text>
            <Text className="text-muted-foreground text-xs">{t('loyalty.earn.checkin')}</Text>
          </View>
          <Pressable
            onPress={onCheckIn}
            disabled={checkedIn || claiming}
            className={`h-9 items-center justify-center rounded-full px-4 ${
              checkedIn ? 'bg-muted' : 'bg-primary active:opacity-85'
            }`}
          >
            <Text
              className={`text-sm font-bold ${checkedIn ? 'text-muted-foreground' : 'text-white'}`}
            >
              {checkedIn ? '✓' : '+5'}
            </Text>
          </Pressable>
        </View>

        {/* Tiers */}
        <View className="flex-row gap-2">
          {TIERS.map((tier) => (
            <View
              key={tier.key}
              className={`border-border bg-card flex-1 items-center rounded-2xl border p-3 ${
                tier.key === cur.key ? 'border-amber-400' : ''
              }`}
            >
              <Text className="text-2xl">{tier.icon}</Text>
              <Text className="text-foreground mt-1 text-xs font-bold">{tier.label}</Text>
              <Text className="text-[10px] font-medium text-amber-600">{tier.cashbackPct}%</Text>
            </View>
          ))}
        </View>

        {/* Earn ways */}
        <View className="border-border bg-card rounded-2xl border p-4">
          <View className="mb-2.5 flex-row items-center gap-2">
            <Gift size={16} color="#d97706" />
            <Text className="text-foreground font-semibold">{t('loyalty.earnTitle')}</Text>
          </View>
          <View className="gap-2">
            {EARN_WAYS.map((w) => (
              <View key={w} className="flex-row items-start gap-2">
                <Text className="text-amber-500">•</Text>
                <Text className="text-foreground flex-1 text-sm">{w}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Redeem ways */}
        <View className="border-border bg-card rounded-2xl border p-4">
          <View className="mb-2.5 flex-row items-center gap-2">
            <Tag size={16} color="#10b981" />
            <Text className="text-foreground font-semibold">{t('loyalty.redeemTitle')}</Text>
          </View>
          <View className="gap-2">
            {REDEEM_WAYS.map((w) => (
              <View key={w} className="flex-row items-start gap-2">
                <Text className="text-emerald-500">•</Text>
                <Text className="text-foreground flex-1 text-sm">{w}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* History */}
        <View className="border-border bg-card rounded-2xl border p-4">
          <Text className="text-foreground mb-2 font-semibold">{t('loyalty.historyTitle')}</Text>
          {history.length === 0 ? (
            <Text className="text-muted-foreground py-3 text-center text-sm">
              {t('loyalty.history.empty')}
            </Text>
          ) : (
            <View>
              {history.map((tx, i) => (
                <HistoryRow key={tx.id} tx={tx} isLast={i === history.length - 1} />
              ))}
            </View>
          )}
        </View>

        <Text className="text-muted-foreground text-center text-[10px]">
          {t('loyalty.worth').replace('{som}', `1 Sello Coin = ${COIN_VALUE_SOM}`)}
        </Text>
      </ScrollView>
    </View>
  );
}

function HistoryRow({ tx, isLast }: { tx: CoinTxn; isLast: boolean }) {
  const { t } = useT();
  const positive = tx.amount > 0;
  return (
    <View
      className={`flex-row items-center gap-3 py-2.5 ${isLast ? '' : 'border-border border-b'}`}
    >
      <View
        className={`h-8 w-8 items-center justify-center rounded-full ${
          positive ? 'bg-emerald-50' : 'bg-rose-50'
        }`}
      >
        {positive ? (
          <ArrowUpRight size={15} color="#10b981" />
        ) : (
          <ArrowDownRight size={15} color="#ef4444" />
        )}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-foreground text-sm font-medium">{tx.reason}</Text>
        <Text className="text-muted-foreground text-xs">
          {t('loyalty.history.daysAgo').replace('{days}', String(tx.daysAgo))}
        </Text>
      </View>
      <Text className={`text-sm font-bold ${positive ? 'text-emerald-600' : 'text-rose-600'}`}>
        {positive ? '+' : ''}
        {formatNumber(tx.amount)}
      </Text>
    </View>
  );
}
