import { useRouter } from 'expo-router';
import { Box, ChevronLeft, CreditCard, Package, Plus, Star } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { productImage } from '../../src/lib/mock-data';
import { toast } from '../../src/store/toast';
import { AppImage } from '../../src/ui/app-image';

const STATS = [
  {
    Icon: CreditCard,
    tint: '#FDF3F5',
    value: '8.4M so‘m',
    label: 'Bugungi savdo',
    delta: '+12%',
    deltaColor: '#1F8A5B',
  },
  {
    Icon: Package,
    tint: '#EDF7F1',
    value: '48',
    label: 'Yangi buyurtma',
    delta: '+8 bugun',
    deltaColor: '#1F8A5B',
  },
  {
    Icon: Star,
    tint: '#FFF6E6',
    value: '4.9',
    label: "Do'kon reytingi",
    delta: '312 sharh',
    deltaColor: '#9a9aa2',
  },
  {
    Icon: Box,
    tint: '#EEF0FF',
    value: '126',
    label: 'Faol mahsulot',
    delta: '4 ta tugadi',
    deltaColor: '#DC2626',
  },
];

// Haftalik savdo (0-1 nisbat) — Ju eng baland (bordo)
const BARS = [
  { d: 'Du', v: 0.5 },
  { d: 'Se', v: 0.62 },
  { d: 'Ch', v: 0.45 },
  { d: 'Pa', v: 0.78 },
  { d: 'Ju', v: 1 },
  { d: 'Sh', v: 0.7 },
  { d: 'Ya', v: 0.58 },
];

const ORDERS = [
  {
    num: '#ECM-2491',
    status: 'Yangi',
    statusBg: '#FDF3F5',
    statusFg: '#531625',
    name: 'Zara Oversize Pidjak',
    qty: '1 dona',
    total: "890 000 so'm",
    seed: 'zara-blazer',
  },
  {
    num: '#ECM-2490',
    status: 'Yig‘ilmoqda',
    statusBg: '#FFF6E6',
    statusFg: '#B45309',
    name: 'Nike Tech Fleece Hoodie',
    qty: '2 dona',
    total: "2 580 000 so'm",
    seed: 'nike-hoodie',
  },
  {
    num: '#ECM-2489',
    status: 'Yangi',
    statusBg: '#FDF3F5',
    statusFg: '#531625',
    name: 'MAC Ruby Woo',
    qty: '3 dona',
    total: "870 000 so'm",
    seed: 'mac-ruby',
  },
];

const TOP = [
  { rank: 1, name: 'Nike Air Max 270', sold: '340 sotildi', rating: '4.8', seed: 'nike-air-max' },
  { rank: 2, name: 'Dior Sauvage EDP', sold: '287 sotildi', rating: '4.8', seed: 'dior-sauvage' },
  { rank: 3, name: 'Chanel N°5', sold: '210 sotildi', rating: '4.9', seed: 'chanel-no5' },
];

export default function SellerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View className="bg-paper flex-1" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center gap-3 px-4 pb-3 pt-2">
        <Pressable
          onPress={() => router.back()}
          className="bg-muted h-10 w-10 items-center justify-center rounded-full"
        >
          <ChevronLeft size={20} color="#0A0A0C" />
        </Pressable>
        <View className="flex-1">
          <Text className="text-foreground font-serif text-2xl leading-6">Sotuvchi kabineti</Text>
          <Text className="text-muted-foreground mt-0.5 text-xs">Bella Boutique · Toshkent</Text>
        </View>
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: '#FDF3F5' }}>
          <Text className="text-primary text-[10px] font-extrabold">Beta</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 20 }}
      >
        {/* Stats grid */}
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {STATS.map((s) => (
            <View
              key={s.label}
              className="border-border rounded-2xl border bg-white p-3.5"
              style={{ width: '48.5%' }}
            >
              <View className="flex-row items-center justify-between">
                <View
                  className="h-[34px] w-[34px] items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: s.tint }}
                >
                  <s.Icon size={18} color="#531625" />
                </View>
                <Text className="text-[11px] font-bold" style={{ color: s.deltaColor }}>
                  {s.delta}
                </Text>
              </View>
              <Text className="text-foreground font-serif-bold mt-2.5 text-[22px]">{s.value}</Text>
              <Text className="mt-0.5 text-[11px] text-neutral-300">{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Weekly chart */}
        <View className="border-border rounded-[18px] border bg-white p-4">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-foreground text-[13px] font-bold">Haftalik savdo</Text>
            <Text className="text-[12px] font-bold" style={{ color: '#1F8A5B' }}>
              +18%
            </Text>
          </View>
          <View className="flex-row items-end justify-between gap-2" style={{ height: 110 }}>
            {BARS.map((b) => (
              <View
                key={b.d}
                className="flex-1 items-center justify-end gap-1.5"
                style={{ height: '100%' }}
              >
                <View
                  style={{
                    width: '100%',
                    height: `${b.v * 82}%`,
                    backgroundColor: b.v === 1 ? '#531625' : '#F3D9E0',
                    borderTopLeftRadius: 7,
                    borderTopRightRadius: 7,
                    borderBottomLeftRadius: 4,
                    borderBottomRightRadius: 4,
                  }}
                />
                <Text
                  className="text-[10px] font-semibold"
                  style={{ color: b.v === 1 ? '#531625' : '#9a9aa2' }}
                >
                  {b.d}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* New orders */}
        <View>
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-foreground text-[13px] font-bold">Yangi buyurtmalar</Text>
            <Text className="text-primary text-xs font-semibold">Barchasi</Text>
          </View>
          <View className="gap-2.5">
            {ORDERS.map((o) => (
              <View
                key={o.num}
                className="border-border flex-row items-center gap-3 rounded-2xl border bg-white p-3"
              >
                <AppImage
                  source={productImage(o.seed, 120)}
                  className="bg-muted h-12 w-12 rounded-xl"
                  contentFit="cover"
                />
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-[11px] font-bold text-neutral-300">{o.num}</Text>
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{ backgroundColor: o.statusBg }}
                    >
                      <Text className="text-[9px] font-extrabold" style={{ color: o.statusFg }}>
                        {o.status}
                      </Text>
                    </View>
                  </View>
                  <Text numberOfLines={1} className="text-foreground mt-1 text-[13px] font-medium">
                    {o.name}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-neutral-300">{o.qty}</Text>
                </View>
                <Text className="text-foreground text-[13px] font-bold">{o.total}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Top products */}
        <View>
          <Text className="text-foreground mb-3 text-[13px] font-bold">Eng ko'p sotilgan</Text>
          <View className="border-border overflow-hidden rounded-[18px] border bg-white">
            {TOP.map((tp, i) => (
              <View
                key={tp.rank}
                className={`flex-row items-center gap-3 px-3.5 py-3 ${i < TOP.length - 1 ? 'border-border border-b' : ''}`}
              >
                <Text className="font-serif-bold w-4 text-base" style={{ color: '#C9A961' }}>
                  {tp.rank}
                </Text>
                <AppImage
                  source={productImage(tp.seed, 120)}
                  className="bg-muted h-[42px] w-[42px] rounded-xl"
                  contentFit="cover"
                />
                <View className="flex-1">
                  <Text numberOfLines={1} className="text-foreground text-[13px] font-medium">
                    {tp.name}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-neutral-300">{tp.sold}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Star size={12} color="#C9A961" fill="#C9A961" />
                  <Text className="text-foreground text-xs font-bold">{tp.rating}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Add product CTA */}
        <Pressable
          onPress={() =>
            toast({ title: 'Tez orada', description: "Mahsulot qo'shish paneli tayyorlanmoqda" })
          }
          className="bg-primary h-[52px] flex-row items-center justify-center gap-2 rounded-full active:opacity-85"
        >
          <Plus size={18} color="#fff" />
          <Text className="text-[15px] font-bold text-white">Yangi mahsulot qo'shish</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
