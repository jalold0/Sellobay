import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Star, ThumbsUp } from 'lucide-react-native';
import * as React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { pickLocalized } from '../../../src/lib/format';
import { useProduct } from '../../../src/lib/hooks';
import { productImage as pImage } from '../../../src/lib/mock-data';
import { AppImage } from '../../../src/ui/app-image';

type Filter = 'all' | '5' | '4' | 'photo';

interface Review {
  name: string;
  init: string;
  tint: string;
  stars: number;
  date: string;
  text: string;
  photo?: string;
  likes: number;
}

const REVIEWS: Review[] = [
  {
    name: 'Aziza R.',
    init: 'A',
    tint: '#FBF2F4',
    stars: 5,
    date: '2 kun oldin',
    text: "Ajoyib mahsulot! Sifati kutganimdan ham yaxshi chiqdi, tez yetkazishdi. Rangi rasmga to'liq mos.",
    photo: 'review-1',
    likes: 24,
  },
  {
    name: 'Bekzod M.',
    init: 'B',
    tint: '#E6F1FB',
    stars: 5,
    date: '5 kun oldin',
    text: 'Narxiga arziydi. Original ekanligiga ishonch hosil qildim, qadoq ham zo‘r edi.',
    likes: 12,
  },
  {
    name: 'Malika T.',
    init: 'M',
    tint: '#E1F5EE',
    stars: 4,
    date: '1 hafta oldin',
    text: "O'lchami biroz kichikroq keldi, lekin umuman olganda mamnunman. Tavsiya qilaman.",
    photo: 'review-2',
    likes: 8,
  },
  {
    name: 'Sardor K.',
    init: 'S',
    tint: '#FAEEDA',
    stars: 5,
    date: '2 hafta oldin',
    text: 'Ikkinchi marta buyurtma beryapman. Doim sifatli, ishonchli do‘kon.',
    likes: 31,
  },
  {
    name: 'Nigora A.',
    init: 'N',
    tint: '#EEEDFE',
    stars: 4,
    date: '3 hafta oldin',
    text: 'Yaxshi mahsulot, yetkazish ozgina kechikdi lekin sifati bilan qopladi.',
    likes: 5,
  },
];

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Barchasi' },
  { id: '5', label: '5 ★' },
  { id: '4', label: '4 ★' },
  { id: 'photo', label: 'Rasm bilan' },
];

export default function ProductReviewsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: product } = useProduct(slug);
  const [filter, setFilter] = React.useState<Filter>('all');

  const rating = product?.rating ?? 4.8;
  const count = product?.reviewCount ?? 124;
  const brand = product?.brand ?? '';
  const name = product ? pickLocalized(product.name, 'uz') : '';

  // 5→1 taqsimot (dizayndagi ko'rinish)
  const breakdown = [
    { star: 5, pct: 78 },
    { star: 4, pct: 14 },
    { star: 3, pct: 5 },
    { star: 2, pct: 2 },
    { star: 1, pct: 1 },
  ];

  const filtered = REVIEWS.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'photo') return !!r.photo;
    return r.stars === Number(filter);
  });

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
          <Text className="text-foreground font-serif text-2xl leading-6">Sharhlar</Text>
          <Text numberOfLines={1} className="text-muted-foreground mt-0.5 text-xs">
            {brand}
            {name ? ` · ${name}` : ''}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Summary */}
        <View
          className="mx-4 mt-1 flex-row items-center gap-[18px] rounded-[18px] p-[18px]"
          style={{ backgroundColor: '#FAF6F4' }}
        >
          <View className="items-center">
            <Text className="text-foreground font-serif-bold text-[42px] leading-[42px]">
              {rating.toFixed(1)}
            </Text>
            <View className="mt-1.5 flex-row gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={13} color="#C9A961" fill="#C9A961" />
              ))}
            </View>
            <Text className="text-muted-foreground mt-1.5 text-[11px]">{count} sharh</Text>
          </View>
          <View className="flex-1 gap-1.5">
            {breakdown.map((b) => (
              <View key={b.star} className="flex-row items-center gap-2">
                <Text className="w-2 text-[11px] font-semibold text-neutral-400">{b.star}</Text>
                <Star size={10} color="#C9A961" fill="#C9A961" />
                <View
                  className="h-1.5 flex-1 overflow-hidden rounded-full"
                  style={{ backgroundColor: '#EAE3DE' }}
                >
                  <View
                    className="h-full rounded-full"
                    style={{ width: `${b.pct}%`, backgroundColor: '#C9A961' }}
                  />
                </View>
                <Text className="w-7 text-right text-[10px] text-neutral-300">{b.pct}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 8,
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 4,
          }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.id;
            return (
              <Pressable
                key={f.id}
                onPress={() => setFilter(f.id)}
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: active ? '#531625' : '#fff',
                  borderWidth: 1,
                  borderColor: active ? '#531625' : '#EAEAEC',
                }}
              >
                <Text
                  className="text-xs font-semibold"
                  style={{ color: active ? '#fff' : '#3a3a40' }}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* List */}
        <View className="gap-[11px] px-4 pt-2">
          {filtered.map((r, idx) => (
            <View key={idx} className="border-border rounded-[18px] border bg-white p-[15px]">
              <View className="flex-row items-center gap-[11px]">
                <View
                  className="h-[42px] w-[42px] items-center justify-center rounded-full"
                  style={{ backgroundColor: r.tint }}
                >
                  <Text className="text-base font-extrabold" style={{ color: '#531625' }}>
                    {r.init}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-foreground text-[13px] font-bold">{r.name}</Text>
                  <View className="mt-1 flex-row gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={12}
                        color={i < r.stars ? '#C9A961' : '#E0DEDA'}
                        fill={i < r.stars ? '#C9A961' : '#E0DEDA'}
                      />
                    ))}
                  </View>
                </View>
                <Text className="text-[11px] text-neutral-300">{r.date}</Text>
              </View>
              <Text className="mt-[11px] text-[13px] leading-[20px] text-neutral-700">
                {r.text}
              </Text>
              {r.photo ? (
                <View className="mt-[11px] flex-row gap-2">
                  <AppImage
                    source={pImage(r.photo, 160)}
                    className="bg-muted h-16 w-16 rounded-xl"
                    contentFit="cover"
                  />
                  <AppImage
                    source={pImage(`${r.photo}-b`, 160)}
                    className="bg-muted h-16 w-16 rounded-xl"
                    contentFit="cover"
                  />
                </View>
              ) : null}
              <View className="border-border mt-3 flex-row items-center gap-1.5 border-t pt-[11px]">
                <ThumbsUp size={14} color="#9a9aa2" />
                <Text className="text-[11px] text-neutral-300">Foydali ({r.likes})</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
