import { useRouter } from 'expo-router';
import { ChevronLeft, Coins, Gift, Package, Sparkles, Ticket, Truck } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchLoyalty } from '../../src/lib/api';
import { formatNumber } from '../../src/lib/format';
import { haptics } from '../../src/lib/haptics';
import { MOCK_LOYALTY } from '../../src/lib/loyalty';
import { toast } from '../../src/store/toast';
import { Gradient } from '../../src/ui/gradient';

interface Reward {
  title: string;
  sub: string;
  cost: number;
  tint: string;
  Icon: typeof Ticket;
}

const REWARDS: Reward[] = [
  { title: "10 000 so'm kupon", sub: 'Chegirma kuponi', cost: 500, tint: '#FDF3F5', Icon: Ticket },
  { title: 'Bepul yetkazish', sub: '1 martalik', cost: 300, tint: '#EDF7F1', Icon: Truck },
  { title: "50 000 so'm kupon", sub: 'Yirik chegirma', cost: 2000, tint: '#FFF6E6', Icon: Ticket },
  {
    title: 'Premium · 1 oy',
    sub: 'Erta sotuv + bepul yetkazish',
    cost: 1500,
    tint: '#EEF0FF',
    Icon: Sparkles,
  },
  { title: "100 000 so'm kupon", sub: 'VIP chegirma', cost: 4000, tint: '#F3EEFB', Icon: Ticket },
  { title: "Sovg'a o'rami", sub: 'Premium qadoq', cost: 250, tint: '#FDF3F5', Icon: Package },
];

export default function CoinShopScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [coins, setCoins] = React.useState(MOCK_LOYALTY.coins);

  React.useEffect(() => {
    let active = true;
    fetchLoyalty()
      .then((d) => {
        if (active && d) setCoins(d.coins);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const redeem = (r: Reward) => {
    if (coins < r.cost) return;
    haptics.success();
    setCoins((c) => c - r.cost);
    toast({ title: 'Almashtirildi ✓', description: r.title, variant: 'success' });
  };

  return (
    <View className="bg-paper flex-1">
      {/* Dark hero */}
      <Gradient
        colors={['#16161A', '#0A0A0C']}
        style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 28 }}
      >
        <View className="flex-row items-center gap-3 pb-3.5 pt-1.5">
          <Pressable
            onPress={() => router.back()}
            className="h-[38px] w-[38px] items-center justify-center rounded-full bg-white/10"
          >
            <ChevronLeft size={19} color="#fff" />
          </Pressable>
          <Text className="font-serif text-[19px] text-white">Tanga do'koni</Text>
        </View>
        <View
          className="flex-row items-center justify-between rounded-[18px] px-[18px] py-[15px]"
          style={{
            backgroundColor: 'rgba(201,169,97,0.14)',
            borderWidth: 1,
            borderColor: 'rgba(201,169,97,0.3)',
          }}
        >
          <View>
            <Text className="text-[11px] uppercase tracking-[0.08em]" style={{ color: '#E5C77A' }}>
              Balansingiz
            </Text>
            <View className="mt-1 flex-row items-baseline gap-1.5">
              <Text className="font-serif-bold text-3xl text-white">{formatNumber(coins)}</Text>
              <Text className="text-[13px]" style={{ color: '#E5C77A' }}>
                tanga
              </Text>
            </View>
          </View>
          <Gradient
            colors={['#E5C77A', '#C9A961']}
            style={{
              width: 54,
              height: 54,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Coins size={26} color="#16161A" />
          </Gradient>
        </View>
      </Gradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
      >
        <Text className="text-foreground mb-3 text-[15px] font-bold">Tangani almashtiring</Text>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {REWARDS.map((r) => {
            const affordable = coins >= r.cost;
            return (
              <View
                key={r.title}
                className="border-border rounded-[18px] border bg-white p-3.5"
                style={{ width: '48.5%' }}
              >
                <View
                  className="h-11 w-11 items-center justify-center rounded-[13px]"
                  style={{ backgroundColor: r.tint }}
                >
                  <r.Icon size={20} color="#531625" />
                </View>
                <Text className="text-foreground mt-3 text-[13px] font-bold leading-[17px]">
                  {r.title}
                </Text>
                <Text className="mt-1 min-h-[28px] text-[11px] text-neutral-300">{r.sub}</Text>
                <View className="mt-2.5 flex-row items-center gap-1.5">
                  <View
                    className="h-[15px] w-[15px] rounded-full"
                    style={{ backgroundColor: '#C9A961' }}
                  />
                  <Text className="text-sm font-extrabold" style={{ color: '#C9A961' }}>
                    {formatNumber(r.cost)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => redeem(r)}
                  disabled={!affordable}
                  className="mt-3 h-[38px] items-center justify-center rounded-full"
                  style={{ backgroundColor: affordable ? '#531625' : '#F1F1F3' }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: affordable ? '#fff' : '#b3b3ba' }}
                  >
                    {affordable ? 'Almashtirish' : 'Yetarli emas'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        <View className="mt-4 flex-row items-center justify-center gap-1.5">
          <Gift size={13} color="#9a9aa2" />
          <Text className="text-center text-[11px] text-neutral-300">
            Har xariddan tanga yig'ing — keyingi mukofot uchun
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
